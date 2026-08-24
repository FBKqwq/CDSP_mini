from functools import lru_cache

from app.contracts import ConsultationContext
from app.core.errors import FeatureNotImplementedError
from app.modules.crud.ports import ClinicalRepository
from app.modules.crud.schemas import (
    ConsultationSnapshot,
    ConsultationUpdate,
    DiagnosisReport,
    ConsultationExpertRead,
    MedicalHistoryCreate,
    MedicalHistoryRead,
    MedicalHistoryUpdate,
    PatientProfileRead,
    PatientProfileUpdate,
    RecordCreate,
    RecordRead,
    ReportComparison,
    TreatmentResult,
)


class CrudService:
    def __init__(self, repository: ClinicalRepository | None = None) -> None:
        self._repository_adapter = repository

    def _repository(self) -> ClinicalRepository:
        if self._repository_adapter is None:
            raise FeatureNotImplementedError("CRUD 数据仓储")
        return self._repository_adapter

    async def get_patient_profile(self) -> PatientProfileRead:
        return await self._repository().get_patient_profile()

    async def update_patient_profile(self, payload: PatientProfileUpdate) -> PatientProfileRead:
        return await self._repository().update_patient_profile(payload)

    async def list_medical_histories(self) -> list[MedicalHistoryRead]:
        return await self._repository().list_medical_histories()

    async def create_medical_history(self, payload: MedicalHistoryCreate) -> MedicalHistoryRead:
        return await self._repository().create_medical_history(payload)

    async def update_medical_history(
        self,
        history_id: str,
        payload: MedicalHistoryUpdate,
    ) -> MedicalHistoryRead:
        return await self._repository().update_medical_history(history_id, payload)

    async def delete_medical_history(self, history_id: str) -> None:
        await self._repository().delete_medical_history(history_id)

    async def list_consultation_experts(self) -> list[ConsultationExpertRead]:
        return await self._repository().list_consultation_experts()

    async def get_consultation(
        self,
        patient_id: str,
        medical_history_id: str | None,
        expert_id: str,
    ) -> ConsultationSnapshot | None:
        return await self._repository().get_consultation(patient_id, medical_history_id, expert_id)

    async def create_consultation(self, context: ConsultationContext) -> ConsultationSnapshot:
        return await self._repository().create_consultation(context)

    async def update_consultation(
        self,
        consultation_id: str,
        payload: ConsultationUpdate,
    ) -> ConsultationSnapshot:
        return await self._repository().update_consultation(consultation_id, payload)

    async def list_records(self, consultation_id: str) -> list[RecordRead]:
        return await self._repository().list_records(consultation_id)

    async def create_record(self, payload: RecordCreate) -> RecordRead:
        return await self._repository().create_record(payload)

    async def enter_diagnosis(self, context: ConsultationContext) -> TreatmentResult:
        return await self._repository().enter_diagnosis(context)

    async def list_reports(self, patient_id: str) -> list[DiagnosisReport]:
        return await self._repository().list_reports(patient_id)

    async def compare_reports(self, report_a_id: str, report_b_id: str) -> ReportComparison:
        return await self._repository().compare_reports(report_a_id, report_b_id)


@lru_cache
def get_crud_service() -> CrudService:
    # Replace this with an injected adapter during the persistence integration stage.
    return CrudService(repository=None)
