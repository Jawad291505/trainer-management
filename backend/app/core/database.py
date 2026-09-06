"""Engine + session wiring.

`get_session` is a FastAPI dependency: it opens one SQLModel `Session` per
request and closes it afterwards, like acquiring/releasing a connection from a
pool in a per-request Express middleware.
"""

from collections.abc import Generator

from sqlmodel import Session, create_engine

from app.core.config import settings

# `pool_pre_ping` quietly discards dead connections (Neon closes idle ones).
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.ENV == "local",
    pool_pre_ping=True,
)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
