"""Short-lived one-time codes, emailed to the user.

Only the HMAC hash of the code is stored. A row is single-use (`consumed_at`),
expires quickly, and counts failed guesses (`attempts`) so a code can be locked
out before it is brute-forced.
"""

import enum
import uuid
from datetime import datetime

from sqlmodel import Field

from app.models.base import TimestampedBase, TZDateTime


class OtpPurpose(str, enum.Enum):
    email_verification = "email_verification"
    password_reset = "password_reset"


class Otp(TimestampedBase, table=True):
    __tablename__ = "otps"

    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    purpose: OtpPurpose = Field(index=True)
    code_hash: str
    expires_at: datetime = Field(sa_type=TZDateTime)
    attempts: int = Field(default=0)
    consumed_at: datetime | None = Field(default=None, sa_type=TZDateTime)
