"""Full CRUD vertical slice. Copy this file's shape for clients, diet plans, etc.

Read routes: any logged-in user. Write routes: admin only (via require_roles).
"""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app import crud
from app.api.deps import CurrentUser, SessionDep, require_roles
from app.models.user import UserRole
from app.schemas.trainer import TrainerCreate, TrainerRead, TrainerUpdate

router = APIRouter(prefix="/trainers", tags=["trainers"])

AdminOnly = Depends(require_roles(UserRole.admin))


@router.get("", response_model=list[TrainerRead])
def list_trainers(
    session: SessionDep,
    _: CurrentUser,
    limit: Annotated[int, Query(le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[TrainerRead]:
    return crud.trainer.list_(session, limit=limit, offset=offset)


@router.get("/{trainer_id}", response_model=TrainerRead)
def get_trainer(trainer_id: uuid.UUID, session: SessionDep, _: CurrentUser) -> TrainerRead:
    trainer = crud.trainer.get(session, trainer_id)
    if trainer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trainer not found")
    return trainer


@router.post("", response_model=TrainerRead, status_code=status.HTTP_201_CREATED, dependencies=[AdminOnly])
def create_trainer(data: TrainerCreate, session: SessionDep) -> TrainerRead:
    if crud.trainer.get_by_user_id(session, data.user_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "That user already has a trainer profile")
    return crud.trainer.create(session, data)


@router.patch("/{trainer_id}", response_model=TrainerRead, dependencies=[AdminOnly])
def update_trainer(
    trainer_id: uuid.UUID, data: TrainerUpdate, session: SessionDep
) -> TrainerRead:
    trainer = crud.trainer.get(session, trainer_id)
    if trainer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trainer not found")
    return crud.trainer.update(session, trainer, data)


@router.delete("/{trainer_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[AdminOnly])
def delete_trainer(trainer_id: uuid.UUID, session: SessionDep) -> None:
    trainer = crud.trainer.get(session, trainer_id)
    if trainer is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Trainer not found")
    crud.trainer.delete(session, trainer)
