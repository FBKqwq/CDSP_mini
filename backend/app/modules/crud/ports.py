from typing import Protocol

from app.modules.crud.schemas import (
    MedicalHistoryCreate,
    MedicalHistoryRead,
    MedicalHistoryUpdate,
    PatientProfileRead,
    PatientProfileUpdate,
)


class ClinicalRepository(Protocol):
    """Persistence/legacy-service boundary for non-LLM clinical data."""

    async def get_patient_profile(self, user_id: str) -> PatientProfileRead: ...

    async def update_patient_profile(
        self,
        user_id: str,
        payload: PatientProfileUpdate,
    ) -> PatientProfileRead: ...

    async def list_medical_histories(self, user_id: str) -> list[MedicalHistoryRead]: ...

    async def create_medical_history(
        self,
        user_id: str,
        payload: MedicalHistoryCreate,
    ) -> MedicalHistoryRead: ...

    async def update_medical_history(
        self,
        user_id: str,
        history_id: str,
        payload: MedicalHistoryUpdate,
    ) -> MedicalHistoryRead: ...

    async def delete_medical_history(self, user_id: str, history_id: str) -> None: ...
