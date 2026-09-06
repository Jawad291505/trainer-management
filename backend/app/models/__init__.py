"""Import every model here so Alembic autogenerate + SQLModel.metadata see them.

When you add a model file, add it to this list.
"""

from app.models.otp import Otp, OtpPurpose
from app.models.session import Session
from app.models.trainer import Trainer, TrainerStatus
from app.models.user import User, UserRole

__all__ = [
    "User",
    "UserRole",
    "Trainer",
    "TrainerStatus",
    "Otp",
    "OtpPurpose",
    "Session",
]
