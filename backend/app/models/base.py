"""Mixin columns shared by every table: UUID primary key + created/updated stamps.

All datetime columns are timezone-aware (`timestamptz` in Postgres) and stored in
UTC, so comparisons in Python never mix naive/aware values.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, func
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


# One reusable SQLAlchemy type for every timestamp column.
TZDateTime = DateTime(timezone=True)


class TimestampedBase(SQLModel):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_type=TZDateTime,
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_type=TZDateTime,
        sa_column_kwargs={"server_default": func.now(), "onupdate": utcnow},
        nullable=False,
    )
