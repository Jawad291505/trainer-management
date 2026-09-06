"""Trainer profile — the role-specific data for a User whose role is `trainer`.

Mirrors the fields the admin portal's mock `trainers` array already uses
(specialization, status, capacity, ...) so the frontend can switch over with
minimal change.
"""

import enum
import uuid

from sqlmodel import Field

from app.models.base import TimestampedBase


class TrainerStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"


class Trainer(TimestampedBase, table=True):
    __tablename__ = "trainers"

    user_id: uuid.UUID = Field(foreign_key="users.id", unique=True, index=True)
    specialization: str
    status: TrainerStatus = Field(default=TrainerStatus.active, index=True)
    capacity: int = Field(default=20, ge=0)
    # One immutable referral code per trainer (see data/referrals.json).
    referral_code: str | None = Field(default=None, unique=True, index=True)
    # The code this trainer signed up with, if any (full referral tracking is a
    # separate feature — this just records what was entered at registration).
    referred_by_code: str | None = Field(default=None, index=True)
    bio: str | None = None
