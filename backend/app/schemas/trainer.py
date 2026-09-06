import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.trainer import TrainerStatus


class TrainerCreate(BaseModel):
    user_id: uuid.UUID
    specialization: str = Field(min_length=1, max_length=120)
    status: TrainerStatus = TrainerStatus.active
    capacity: int = Field(default=20, ge=0, le=500)
    bio: str | None = None


class TrainerUpdate(BaseModel):
    """All optional — this is a PATCH. Only provided fields are changed."""

    specialization: str | None = Field(default=None, min_length=1, max_length=120)
    status: TrainerStatus | None = None
    capacity: int | None = Field(default=None, ge=0, le=500)
    bio: str | None = None


class TrainerRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    specialization: str
    status: TrainerStatus
    capacity: int
    referral_code: str | None
    referred_by_code: str | None
    bio: str | None
    created_at: datetime
    updated_at: datetime
