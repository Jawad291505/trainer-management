import uuid

from sqlmodel import Session, select

from app.models.trainer import Trainer
from app.schemas.trainer import TrainerCreate, TrainerUpdate


def get(session: Session, trainer_id: uuid.UUID) -> Trainer | None:
    return session.get(Trainer, trainer_id)


def get_by_user_id(session: Session, user_id: uuid.UUID) -> Trainer | None:
    return session.exec(select(Trainer).where(Trainer.user_id == user_id)).first()


def list_(session: Session, *, limit: int = 50, offset: int = 0) -> list[Trainer]:
    stmt = select(Trainer).order_by(Trainer.created_at.desc()).limit(limit).offset(offset)
    return list(session.exec(stmt).all())


def create(session: Session, data: TrainerCreate) -> Trainer:
    trainer = Trainer.model_validate(data)
    session.add(trainer)
    session.commit()
    session.refresh(trainer)
    return trainer


def update(session: Session, trainer: Trainer, data: TrainerUpdate) -> Trainer:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(trainer, field, value)
    session.add(trainer)
    session.commit()
    session.refresh(trainer)
    return trainer


def delete(session: Session, trainer: Trainer) -> None:
    session.delete(trainer)
    session.commit()
