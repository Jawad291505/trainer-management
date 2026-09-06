"""Refresh-token session rows: create, look up by raw token, revoke."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlmodel import Session as DBSession
from sqlmodel import select

from app.core.config import settings
from app.core.security import generate_refresh_token, hash_token
from app.models.session import Session


def _now() -> datetime:
    return datetime.now(UTC)


def create(
    db: DBSession,
    user_id: uuid.UUID,
    *,
    user_agent: str | None = None,
    ip: str | None = None,
) -> tuple[Session, str]:
    """Returns (row, raw_refresh_token). The raw token is shown to the client once."""
    raw = generate_refresh_token()
    row = Session(
        user_id=user_id,
        token_hash=hash_token(raw),
        expires_at=_now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=(user_agent or "")[:400] or None,
        ip=ip,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row, raw


def get_active(db: DBSession, raw_token: str) -> Session | None:
    row = db.exec(select(Session).where(Session.token_hash == hash_token(raw_token))).first()
    if row is None or row.revoked_at is not None:
        return None
    if row.expires_at.replace(tzinfo=UTC) < _now():
        return None
    return row


def revoke(db: DBSession, row: Session) -> None:
    row.revoked_at = _now()
    db.add(row)
    db.commit()


def revoke_all_for_user(db: DBSession, user_id: uuid.UUID) -> int:
    rows = db.exec(
        select(Session).where(
            Session.user_id == user_id,
            Session.revoked_at.is_(None),  # type: ignore[union-attr]
        )
    ).all()
    for row in rows:
        row.revoked_at = _now()
        db.add(row)
    db.commit()
    return len(rows)


def rotate(
    db: DBSession, row: Session, *, user_agent: str | None = None, ip: str | None = None
) -> tuple[Session, str]:
    """Revoke the presented session and issue a fresh one (refresh-token rotation)."""
    row.revoked_at = _now()
    row.last_used_at = _now()
    db.add(row)
    db.commit()
    return create(db, row.user_id, user_agent=user_agent, ip=ip)
