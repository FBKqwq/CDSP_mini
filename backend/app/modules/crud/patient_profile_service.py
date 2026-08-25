from datetime import date

from fastapi import Depends
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.errors import BusinessError
from app.db.models import AppUser, PatientProfile
from app.db.session import get_db
from app.modules.crud.schemas import (
    PatientProfileRead,
    PatientProfileUpdate,
)


def calculate_age(birth_date: date | None) -> int | None:
    if birth_date is None:
        return None

    today = date.today()

    return (
        today.year
        - birth_date.year
        - (
            (today.month, today.day)
            < (birth_date.month, birth_date.day)
        )
    )


class PatientProfileService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _to_read_model(
        self,
        profile: PatientProfile,
    ) -> PatientProfileRead:
        return PatientProfileRead(
            id=profile.id,
            code=profile.code,
            name=profile.name,
            gender=profile.gender,
            birth_date=profile.birth_date,
            age=calculate_age(profile.birth_date),
            lock_version=profile.lock_version,
        )

    def get_patient_profile(
        self,
        current_user: AppUser,
    ) -> PatientProfileRead:
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

        return self._to_read_model(profile)

    def update_patient_profile(
        self,
        current_user: AppUser,
        payload: PatientProfileUpdate,
    ) -> PatientProfileRead:
        result = self.db.execute(
            update(PatientProfile)
            .where(
                PatientProfile.user_id == current_user.id,
                PatientProfile.deleted_at.is_(None),
                PatientProfile.lock_version == payload.lock_version,
            )
            .values(
                name=payload.name,
                gender=payload.gender,
                birth_date=payload.birth_date,
                lock_version=PatientProfile.lock_version + 1,
            )
        )

        if result.rowcount == 0:
            profile = self.db.scalar(
                select(PatientProfile).where(
                    PatientProfile.user_id == current_user.id,
                    PatientProfile.deleted_at.is_(None),
                )
            )

            self.db.rollback()

            if profile is None:
                raise BusinessError(
                    "PROFILE_NOT_FOUND",
                    "患者档案不存在",
                    404,
                )

            raise BusinessError(
                "VERSION_CONFLICT",
                "数据已被其他操作修改，请刷新后重试",
                409,
            )

        self.db.commit()

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

        return self._to_read_model(profile)


def get_patient_profile_service(
    db: Session = Depends(get_db),
) -> PatientProfileService:
    return PatientProfileService(db)