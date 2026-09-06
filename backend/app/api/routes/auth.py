"""Trainer auth: register -> email OTP -> verify, login, refresh, logout,
forgot/reset/change password. Hand-rolled JWT + a DB-backed refresh session.

The logic lives in app.services.auth; these handlers just move data in and out.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentUser, SessionDep
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LogoutRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
)
from app.schemas.token import TokenPair
from app.schemas.user import UserRead
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _meta(request: Request) -> tuple[str | None, str | None]:
    ua = request.headers.get("user-agent")
    ip = request.client.host if request.client else None
    return ua, ip


def _pair(access: str, refresh: str) -> TokenPair:
    return TokenPair(access_token=access, refresh_token=refresh)


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, session: SessionDep) -> MessageResponse:
    auth_service.register_trainer(
        session,
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        referral_code=data.referral_code,
    )
    return MessageResponse(message="Account created. Check your email for a 6-digit code.")


@router.post("/verify-email", response_model=TokenPair)
def verify_email(data: VerifyEmailRequest, session: SessionDep, request: Request) -> TokenPair:
    ua, ip = _meta(request)
    access, refresh = auth_service.verify_email(
        session, email=data.email, code=data.code, user_agent=ua, ip=ip
    )
    return _pair(access, refresh)


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(data: ResendVerificationRequest, session: SessionDep) -> MessageResponse:
    auth_service.resend_verification(session, data.email)
    return MessageResponse(message="If that account needs verification, a new code is on its way.")


@router.post("/login", response_model=TokenPair)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: SessionDep,
    request: Request,
) -> TokenPair:
    ua, ip = _meta(request)
    access, refresh = auth_service.login(
        session, email=form.username, password=form.password, user_agent=ua, ip=ip
    )
    return _pair(access, refresh)


@router.post("/refresh", response_model=TokenPair)
def refresh(data: RefreshRequest, session: SessionDep, request: Request) -> TokenPair:
    ua, ip = _meta(request)
    access, refresh_token = auth_service.refresh(
        session, refresh_token=data.refresh_token, user_agent=ua, ip=ip
    )
    return _pair(access, refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(data: LogoutRequest, session: SessionDep) -> Response:
    auth_service.logout(session, refresh_token=data.refresh_token)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/logout-all", response_model=MessageResponse)
def logout_all(current_user: CurrentUser, session: SessionDep) -> MessageResponse:
    count = auth_service.logout_all(session, current_user)
    return MessageResponse(message=f"Signed out of {count} session(s).")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(data: ForgotPasswordRequest, session: SessionDep) -> MessageResponse:
    auth_service.forgot_password(session, data.email)
    return MessageResponse(message="If an account exists for that email, a reset code has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(data: ResetPasswordRequest, session: SessionDep) -> MessageResponse:
    auth_service.reset_password(
        session, email=data.email, code=data.code, new_password=data.new_password
    )
    return MessageResponse(message="Password updated. Sign in with your new password.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    data: ChangePasswordRequest, current_user: CurrentUser, session: SessionDep
) -> MessageResponse:
    auth_service.change_password(
        session,
        current_user,
        current_password=data.current_password,
        new_password=data.new_password,
    )
    return MessageResponse(message="Password changed. Other sessions have been signed out.")


@router.get("/me", response_model=UserRead)
def me(current_user: CurrentUser) -> UserRead:
    return current_user
