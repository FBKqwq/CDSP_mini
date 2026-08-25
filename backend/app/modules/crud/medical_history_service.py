from datetime import datetime, timezone

from fastapi import Depends
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.core.ids import new_ulid
from app.db.models import AppUser, MedicalHistory, PatientProfile
from app.db.session import get_db
from app.modules.crud.schemas import (
    MedicalHistoryCreate,
    MedicalHistoryRead,
    MedicalHistoryUpdate,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class MedicalHistoryService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _get_current_patient(
        self,
        current_user: AppUser,
    ) -> PatientProfile:
        profile = self.db.scalar(
            select(PatientProfile).where(
                PatientProfile.user_id == current_user.id,
                PatientProfile.deleted_at.is_(None),
            )
        )

        if profile is None:
            raise BusinessError(
                "PROFILE_NOT_FOUND",
                "患者档案不存在",
                404,
            )

        return profile

    def _to_read_model(
        self,
        history: MedicalHistory,
    ) -> MedicalHistoryRead:
        return MedicalHistoryRead(
            id=history.id,
            name=history.name,
            description=history.description,
            diagnosed_at=history.diagnosed_at,
            lock_version=history.lock_version,
        )

    def list_medical_histories(
        self,
        current_user: AppUser,
    ) -> list[MedicalHistoryRead]:

        profile = self._get_current_patient(current_user)

        histories = self.db.scalars(
            select(MedicalHistory)
            .where(
                MedicalHistory.patient_id == profile.id,
                MedicalHistory.deleted_at.is_(None),
            )
            .order_by(
                MedicalHistory.diagnosed_at.desc(),
                MedicalHistory.updated_at.desc(),
            )
        ).all()

        return [
            self._to_read_model(history)
            for history in histories
        ]

    def create_medical_history(
        self,
        current_user: AppUser,
        payload: MedicalHistoryCreate,
    ) -> MedicalHistoryRead:

        profile = self._get_current_patient(current_user)

        history = MedicalHistory(
            id=new_ulid(),
            patient_id=profile.id,
            name=payload.name,
            description=payload.description,
            diagnosed_at=payload.diagnosed_at,
            lock_version=0,
        )

        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)

        return self._to_read_model(history)

    def update_medical_history(
        self,
        current_user: AppUser,
        history_id: str,
        payload: MedicalHistoryUpdate,
    ) -> MedicalHistoryRead:

        profile = self._get_current_patient(current_user)

        result = self.db.execute(
            update(MedicalHistory)
            .where(
                MedicalHistory.id == history_id,
                MedicalHistory.patient_id == profile.id,
                MedicalHistory.deleted_at.is_(None),
                MedicalHistory.lock_version == payload.lock_version,
            )
            .values(
                name=payload.name,
                description=payload.description,
                diagnosed_at=payload.diagnosed_at,
                lock_version=MedicalHistory.lock_version + 1,
            )
        )

        if result.rowcount == 0:
            self.db.rollback()

            raise BusinessError(
                "HISTORY_NOT_FOUND",
                "历史疾病不存在",
                404,
            )

        self.db.commit()

        history = self.db.scalar(
            select(MedicalHistory).where(
                MedicalHistory.id == history_id,
            )
        )

        return self._to_read_model(history)

    def delete_medical_history(
        self,
        current_user: AppUser,
        history_id: str,
    ) -> None:

        profile = self._get_current_patient(current_user)

        history = self.db.scalar(
            select(MedicalHistory).where(
                MedicalHistory.id == history_id,
                MedicalHistory.patient_id == profile.id,
            )
        )

        # 删除幂等
        if history is None:
            return

        if history.deleted_at is not None:
            return

        history.deleted_at = utc_now()

        self.db.commit()


def get_medical_history_service(
    db: Session = Depends(get_db),
) -> MedicalHistoryService:
    return MedicalHistoryService(db)