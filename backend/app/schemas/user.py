"""Request/response shapes for User.

Splitting "the DB model" from "what the API accepts / returns" is the big habit
shift from Mongoose. `UserCreate` is the validated request body; `UserRead` is
the safe response (note: no `hashed_password`).
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=120)
    role: UserRole = UserRole.client


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime


class UserLogin(BaseModel):
    email: EmailStr
    password: str
