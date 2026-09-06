"""Request/response bodies for the auth endpoints."""

from typing import Annotated

from pydantic import BaseModel, EmailStr, Field

# Reusable constrained types (safe to share, unlike a single Field() instance).
Password = Annotated[str, Field(min_length=8, max_length=128)]
OtpCode = Annotated[str, Field(pattern=r"^\d{6}$")]
FullName = Annotated[str, Field(min_length=1, max_length=120)]


class RegisterRequest(BaseModel):
    email: EmailStr
    password: Password
    full_name: FullName
    referral_code: str | None = Field(default=None, max_length=40)


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: OtpCode


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: OtpCode
    new_password: Password


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: Password


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class MessageResponse(BaseModel):
    message: str
