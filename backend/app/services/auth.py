"""Auth orchestration: the multi-step flows that tie crud + email together.

Routes stay thin and just translate HTTP <-> these functions. Functions here
raise `fastapi.HTTPException` directly so the route doesn't need try/except.
"""

import math

from fastapi import HTTPException, status
from sqlmodel import Session as DBSession

from app import crud
from app.core.config import settings
from app.core.email import send_otp_email
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.crud.otp import OtpError
from app.models.otp import OtpPurpose
from app.models.trainer import Trainer
from app.models.user import User, UserRole


class _CooldownError(Exception):
    def __init__(self, retry_after: int) -> None:
        self.retry_after = retry_after


# --- helpers ------------------------------------------------------------------


def _dispatch_otp(
    db: DBSession, user: User, purpose: OtpPurpose, *, enforce_cooldown: bool = False
) -> None:
    if enforce_cooldown:
        elapsed = crud.otp.seconds_since_last(db, user.id, purpose)
        if elapsed is not None and elapsed < settings.OTP_RESEND_COOLDOWN_SECONDS:
            raise _CooldownError(math.ceil(settings.OTP_RESEND_COOLDOWN_SECONDS - elapsed))
    code = crud.otp.issue(db, user.id, purpose)
    send_otp_email(to=user.email, code=code, purpose=purpose.value)


def _issue_tokens(
    db: DBSession, user: User, *, user_agent: str | None, ip: str | None
) -> tuple[str, str]:
    _, raw_refresh = crud.session.create(db, user.id, user_agent=user_agent, ip=ip)
    access = create_access_token(str(user.id), {"role": user.role.value})
    return access, raw_refresh


# --- registration + email verification --------------------------------------


def register_trainer(
    db: DBSession, *, email: str, password: str, full_name: str, referral_code: str | None
) -> User:
    email = email.lower()
    if crud.user.get_by_email(db, email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hash_password(password),
        role=UserRole.trainer,
        is_verified=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    db.add(
        Trainer(
            user_id=user.id,
            specialization="General Fitness",
            referred_by_code=(referral_code or "").strip() or None,
        )
    )
    db.commit()

    _dispatch_otp(db, user, OtpPurpose.email_verification)
    return user


def resend_verification(db: DBSession, email: str) -> None:
    user = crud.user.get_by_email(db, email.lower())
    # Uniform response whether or not the account exists / is already verified.
    if user is None or user.is_verified:
        return
    try:
        _dispatch_otp(db, user, OtpPurpose.email_verification, enforce_cooldown=True)
    except _CooldownError as exc:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Please wait {exc.retry_after}s before requesting another code",
            headers={"Retry-After": str(exc.retry_after)},
        ) from None


def verify_email(
    db: DBSession, *, email: str, code: str, user_agent: str | None, ip: str | None
) -> tuple[str, str]:
    user = crud.user.get_by_email(db, email.lower())
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect code.")
    if user.is_verified:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already verified. Please log in.")
    try:
        crud.otp.verify(db, user.id, OtpPurpose.email_verification, code)
    except OtpError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from None

    crud.user.mark_verified(db, user)
    return _issue_tokens(db, user, user_agent=user_agent, ip=ip)


# --- login / refresh / logout ---------------------------------------------------


def login(
    db: DBSession, *, email: str, password: str, user_agent: str | None, ip: str | None
) -> tuple[str, str]:
    user = crud.user.authenticate(db, email, password)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    if not user.is_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Email not verified")
    return _issue_tokens(db, user, user_agent=user_agent, ip=ip)


def refresh(
    db: DBSession, *, refresh_token: str, user_agent: str | None, ip: str | None
) -> tuple[str, str]:
    row = crud.session.get_active(db, refresh_token)
    invalid = HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")
    if row is None:
        raise invalid
    user = crud.user.get(db, row.user_id)
    if user is None or not user.is_active:
        raise invalid

    new_row, raw_refresh = crud.session.rotate(db, row, user_agent=user_agent, ip=ip)
    access = create_access_token(str(user.id), {"role": user.role.value})
    return access, raw_refresh


def logout(db: DBSession, *, refresh_token: str) -> None:
    row = crud.session.get_active(db, refresh_token)
    if row is not None:
        crud.session.revoke(db, row)


def logout_all(db: DBSession, user: User) -> int:
    return crud.session.revoke_all_for_user(db, user.id)


# --- password reset -----------------------------------------------------------


def forgot_password(db: DBSession, email: str) -> None:
    user = crud.user.get_by_email(db, email.lower())
    if user is None or not user.is_active:
        return
    try:
        _dispatch_otp(db, user, OtpPurpose.password_reset, enforce_cooldown=True)
    except _CooldownError:
        # Swallow so the response is identical regardless of recent activity.
        return


def reset_password(db: DBSession, *, email: str, code: str, new_password: str) -> None:
    user = crud.user.get_by_email(db, email.lower())
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect code.")
    try:
        crud.otp.verify(db, user.id, OtpPurpose.password_reset, code)
    except OtpError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from None

    crud.user.set_password(db, user, new_password)
    crud.session.revoke_all_for_user(db, user.id)  # force re-login everywhere
    if not user.is_verified:
        crud.user.mark_verified(db, user)


def change_password(
    db: DBSession, user: User, *, current_password: str, new_password: str
) -> int:
    if not verify_password(current_password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    crud.user.set_password(db, user, new_password)
    return crud.session.revoke_all_for_user(db, user.id)
