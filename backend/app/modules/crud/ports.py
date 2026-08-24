from typing import Protocol

from app.contracts import ConsultationContext
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


class ClinicalRepository(Protocol):
    """Persistence/legacy-service boundary for non-LLM clinical data."""

    async def get_patient_profile(self) -> PatientProfileRead: ...

    async def update_patient_profile(self, payload: PatientProfileUpdate) -> PatientProfileRead: ...

    async def list_medical_histories(self) -> list[MedicalHistoryRead]: ...

    async def create_medical_history(self, payload: MedicalHistoryCreate) -> MedicalHistoryRead: ...

    async def update_medical_history(
        self,
        history_id: str,
        payload: MedicalHistoryUpdate,
    ) -> MedicalHistoryRead: ...

    async def delete_medical_history(self, history_id: str) -> None: ...

    async def list_consultation_experts(self) -> list[ConsultationExpertRead]: ...

    async def get_consultation(
        self,
        patient_id: str,
        medical_history_id: str | None,
        expert_id: str,
    ) -> ConsultationSnapshot | None: ...

    async def create_consultation(self, context: ConsultationContext) -> ConsultationSnapshot: ...

    async def update_consultation(
        self,
        consultation_id: str,
        payload: ConsultationUpdate,
    ) -> ConsultationSnapshot: ...

    async def list_records(self, consultation_id: str) -> list[RecordRead]: ...

    async def create_record(self, payload: RecordCreate) -> RecordRead: ...

    async def enter_diagnosis(self, context: ConsultationContext) -> TreatmentResult: ...

    async def list_reports(self, patient_id: str) -> list[DiagnosisReport]: ...

    async def compare_reports(self, report_a_id: str, report_b_id: str) -> ReportComparison: ...
