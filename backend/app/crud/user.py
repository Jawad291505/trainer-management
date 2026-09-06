"""Data-access functions for User. Routes call these; they never touch the ORM directly.

Keeping queries here (not in route handlers) is the equivalent of a repository /
service layer in an Express app.
"""

import uuid

from sqlmodel import Session, select

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


def get(session: Session, user_id: uuid.UUID) -> User | None:
    return session.get(User, user_id)


def get_by_email(session: Session, email: str) -> User | None:
    return session.exec(select(User).where(User.email == email)).first()


def create(session: Session, data: UserCreate) -> User:
    user = User(
        email=str(data.email).lower(),
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def authenticate(session: Session, email: str, password: str) -> User | None:
    user = get_by_email(session, email.lower())
    if user is None or not verify_password(password, user.hashed_password):
        return None
    return user


def mark_verified(session: Session, user: User) -> User:
    user.is_verified = True
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def set_password(session: Session, user: User, new_password: str) -> User:
    user.hashed_password = hash_password(new_password)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
