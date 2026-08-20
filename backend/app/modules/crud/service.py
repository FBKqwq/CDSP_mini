from functools import lru_cache

from app.contracts import ConsultationContext
from app.core.errors import FeatureNotImplementedError
from app.modules.crud.ports import ClinicalRepository
from app.modules.crud.schemas import (
    ConsultationSnapshot,
    ConsultationUpdate,
    DiagnosisReport,
    DiagnosisSummary,
    DiseaseGroupRead,
    DoctorRead,
    PatientCreate,
    PatientRead,
    RecordCreate,
    RecordRead,
    ReportComparison,
)


class CrudService:
    def __init__(self, repository: ClinicalRepository | None = None) -> None:
        self._repository_adapter = repository

    def _repository(self) -> ClinicalRepository:
        if self._repository_adapter is None:
            raise FeatureNotImplementedError("CRUD 数据仓储")
        return self._repository_adapter

    async def list_patients(self, query: str | None) -> list[PatientRead]:
        return await self._repository().list_patients(query)

    async def create_patient(self, payload: PatientCreate) -> PatientRead:
        return await self._repository().create_patient(payload)

    async def delete_patient(self, patient_id: str) -> None:
        await self._repository().delete_patient(patient_id)

    async def list_disease_groups(self) -> list[DiseaseGroupRead]:
        return await self._repository().list_disease_groups()

    async def list_doctors(self, disease_group_id: str | None) -> list[DoctorRead]:
        return await self._repository().list_doctors(disease_group_id)

    async def get_consultation(
        self,
        patient_id: str,
        disease_group_id: str,
        doctor_id: str,
    ) -> ConsultationSnapshot | None:
        return await self._repository().get_consultation(patient_id, disease_group_id, doctor_id)

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

    async def enter_diagnosis(self, context: ConsultationContext) -> DiagnosisSummary:
        return await self._repository().enter_diagnosis(context)

    async def list_reports(self, patient_id: str) -> list[DiagnosisReport]:
        return await self._repository().list_reports(patient_id)

    async def compare_reports(self, report_a_id: str, report_b_id: str) -> ReportComparison:
        return await self._repository().compare_reports(report_a_id, report_b_id)


@lru_cache
def get_crud_service() -> CrudService:
    # Replace this with an injected adapter during the persistence integration stage.
    return CrudService(repository=None)
