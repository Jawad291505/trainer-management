"""Create / verify one-time codes.

`issue` invalidates any earlier unused code for the same purpose, then stores the
hash of a fresh one. `verify` checks expiry + attempt count, bumps `attempts` on a
wrong guess, and marks the row consumed on success.
"""

import uuid
from datetime import UTC, datetime, timedelta

from sqlmodel import Session, select

from app.core.config import settings
from app.core.security import generate_otp, hash_token, tokens_match
from app.models.otp import Otp, OtpPurpose


class OtpError(Exception):
    """Raised for any verify failure; message is safe to show the user."""


def _now() -> datetime:
    return datetime.now(UTC)


def latest(session: Session, user_id: uuid.UUID, purpose: OtpPurpose) -> Otp | None:
    stmt = (
        select(Otp)
        .where(Otp.user_id == user_id, Otp.purpose == purpose)
        .order_by(Otp.created_at.desc())
    )
    return session.exec(stmt).first()


def seconds_since_last(session: Session, user_id: uuid.UUID, purpose: OtpPurpose) -> float | None:
    row = latest(session, user_id, purpose)
    if row is None:
        return None
    return (_now() - row.created_at.replace(tzinfo=UTC)).total_seconds()


def issue(session: Session, user_id: uuid.UUID, purpose: OtpPurpose) -> str:
    """Returns the raw code (to be emailed). Only its hash is stored."""
    # Consume any outstanding codes for this purpose so only the newest works.
    for old in session.exec(
        select(Otp).where(
            Otp.user_id == user_id,
            Otp.purpose == purpose,
            Otp.consumed_at.is_(None),  # type: ignore[union-attr]
        )
    ).all():
        old.consumed_at = _now()
        session.add(old)

    code = generate_otp()
    session.add(
        Otp(
            user_id=user_id,
            purpose=purpose,
            code_hash=hash_token(code),
            expires_at=_now() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
        )
    )
    session.commit()
    return code


def verify(session: Session, user_id: uuid.UUID, purpose: OtpPurpose, code: str) -> None:
    """Raises OtpError on any problem; returns None and consumes the code on success."""
    row = latest(session, user_id, purpose)
    if row is None or row.consumed_at is not None:
        raise OtpError("No active code. Request a new one.")
    if row.expires_at.replace(tzinfo=UTC) < _now():
        raise OtpError("Code expired. Request a new one.")
    if row.attempts >= settings.OTP_MAX_ATTEMPTS:
        raise OtpError("Too many attempts. Request a new one.")

    if not tokens_match(code, row.code_hash):
        row.attempts += 1
        session.add(row)
        session.commit()
        raise OtpError("Incorrect code.")

    row.consumed_at = _now()
    session.add(row)
    session.commit()
