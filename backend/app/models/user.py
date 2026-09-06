"""The auth identity. Every person who can log in — admin, trainer, client — is a User.

Role-specific profile data (e.g. a trainer's specialization / capacity) lives on
a separate table like `Trainer`, linked back to `user_id`.
"""

import enum

from sqlmodel import Field

from app.models.base import TimestampedBase


class UserRole(str, enum.Enum):
    admin = "admin"
    trainer = "trainer"
    client = "client"


class User(TimestampedBase, table=True):
    __tablename__ = "users"

    email: str = Field(unique=True, index=True)
    hashed_password: str
    full_name: str
    role: UserRole = Field(default=UserRole.client, index=True)
    # is_active  = account not disabled/banned by an admin
    # is_verified = email address confirmed via OTP; login is blocked until True
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
