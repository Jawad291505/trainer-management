"""One row per active refresh token = one logged-in device.

The raw refresh token is returned to the client once; we keep only its hash.
Signing out revokes the row (`revoked_at`); the short-lived access token then
simply expires on its own.
"""

import uuid
from datetime import datetime

from sqlmodel import Field

from app.models.base import TimestampedBase, TZDateTime


class Session(TimestampedBase, table=True):
    __tablename__ = "sessions"

    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    token_hash: str = Field(unique=True, index=True)
    expires_at: datetime = Field(sa_type=TZDateTime)
    revoked_at: datetime | None = Field(default=None, sa_type=TZDateTime)
    last_used_at: datetime | None = Field(default=None, sa_type=TZDateTime)
    user_agent: str | None = Field(default=None)
    ip: str | None = Field(default=None)
