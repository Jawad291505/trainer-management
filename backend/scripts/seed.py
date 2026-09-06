"""One-off seed: load the repo-root JSON master data into Postgres.

Run after migrations:  uv run python -m scripts.seed
Idempotent — skips rows that already exist (matched by email).
"""

import json
from pathlib import Path

from sqlmodel import Session, select

from app.core.database import engine
from app.core.security import hash_password
from app.models.trainer import Trainer, TrainerStatus
from app.models.user import User, UserRole

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
DEFAULT_PASSWORD = "changeme123"  # dev only


def _get_or_create_user(session: Session, *, email: str, full_name: str, role: UserRole) -> User:
    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        return existing
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        hashed_password=hash_password(DEFAULT_PASSWORD),
        is_verified=True,  # seeded accounts skip the email OTP step
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def seed_admin(session: Session) -> None:
    _get_or_create_user(
        session,
        email="admin@fittrack.io",
        full_name="Alexandra Reed",
        role=UserRole.admin,
    )
    print("  admin@fittrack.io  (password:", DEFAULT_PASSWORD, ")")


def seed_trainers(session: Session) -> None:
    referrals = json.loads((DATA_DIR / "referrals.json").read_text(encoding="utf-8"))
    for row in referrals["trainers"]:
        user = _get_or_create_user(
            session,
            email=row["email"],
            full_name=row["name"],
            role=UserRole.trainer,
        )
        has_profile = session.exec(select(Trainer).where(Trainer.user_id == user.id)).first()
        if has_profile:
            continue
        session.add(
            Trainer(
                user_id=user.id,
                specialization="General Fitness",
                status=TrainerStatus.active,
                capacity=20,
                referral_code=row["code"],
            )
        )
        session.commit()
        print(f"  trainer: {row['name']}  ({row['email']})")


def main() -> None:
    with Session(engine) as session:
        print("Seeding admin...")
        seed_admin(session)
        print("Seeding trainers from data/referrals.json...")
        seed_trainers(session)
    print("Done.")


if __name__ == "__main__":
    main()
