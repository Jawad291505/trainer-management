"""Reusable FastAPI dependencies (the "middleware" of this app).

`CurrentUser` = "this route requires a valid Bearer token"; inject it and you get
the `User` row. `require_roles(...)` builds a stricter dependency for admin-only
routes.
"""

import uuid
from collections.abc import Callable
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session

from app import crud
from app.core.database import get_session
from app.core.security import decode_access_token
from app.models.user import User, UserRole

# tokenUrl is only used to render the "Authorize" button in /docs.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SessionDep = Annotated[Session, Depends(get_session)]


def get_current_user(
    session: SessionDep,
    token: Annotated[str, Depends(oauth2_scheme)],
) -> User:
    creds_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise creds_error
    except jwt.PyJWTError as exc:
        raise creds_error from exc

    user = crud.user.get(session, uuid.UUID(user_id))
    if user is None or not user.is_active:
        raise creds_error
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    def _guard(user: CurrentUser) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _guard
