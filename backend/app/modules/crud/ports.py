from typing import Protocol

from app.contracts import ConsultationContext
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


class ClinicalRepository(Protocol):
    """Persistence/legacy-service boundary for non-LLM clinical data."""

    async def list_patients(self, query: str | None) -> list[PatientRead]: ...

    async def create_patient(self, payload: PatientCreate) -> PatientRead: ...

    async def delete_patient(self, patient_id: str) -> None: ...

    async def list_disease_groups(self) -> list[DiseaseGroupRead]: ...

    async def list_doctors(self, disease_group_id: str | None) -> list[DoctorRead]: ...

    async def get_consultation(
        self,
        patient_id: str,
        disease_group_id: str,
        doctor_id: str,
    ) -> ConsultationSnapshot | None: ...

    async def create_consultation(self, context: ConsultationContext) -> ConsultationSnapshot: ...

    async def update_consultation(
        self,
        consultation_id: str,
        payload: ConsultationUpdate,
    ) -> ConsultationSnapshot: ...

    async def list_records(self, consultation_id: str) -> list[RecordRead]: ...

    async def create_record(self, payload: RecordCreate) -> RecordRead: ...

    async def enter_diagnosis(self, context: ConsultationContext) -> DiagnosisSummary: ...

    async def list_reports(self, patient_id: str) -> list[DiagnosisReport]: ...

    async def compare_reports(self, report_a_id: str, report_b_id: str) -> ReportComparison: ...
