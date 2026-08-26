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

    async def get_patient_profile(self, user_id: str) -> PatientProfileRead:
        return await self._repository().get_patient_profile(user_id)

    async def update_patient_profile(
        self,
        user_id: str,
        payload: PatientProfileUpdate,
    ) -> PatientProfileRead:
        return await self._repository().update_patient_profile(user_id, payload)

    async def list_medical_histories(self, user_id: str) -> list[MedicalHistoryRead]:
        return await self._repository().list_medical_histories(user_id)

    async def create_medical_history(
        self,
        user_id: str,
        payload: MedicalHistoryCreate,
    ) -> MedicalHistoryRead:
        return await self._repository().create_medical_history(user_id, payload)

    async def update_medical_history(
        self,
        user_id: str,
        history_id: str,
        payload: MedicalHistoryUpdate,
    ) -> MedicalHistoryRead:
        return await self._repository().update_medical_history(user_id, history_id, payload)

    async def delete_medical_history(self, user_id: str, history_id: str) -> None:
        await self._repository().delete_medical_history(user_id, history_id)

    async def list_consultation_experts(self) -> list[ConsultationExpertRead]:
        raise FeatureNotImplementedError("问诊专家")

    async def get_consultation(
        self,
        patient_id: str,
        medical_history_id: str | None,
        expert_id: str,
    ) -> ConsultationSnapshot | None:
        raise FeatureNotImplementedError("问诊会话")

    async def create_consultation(self, context: ConsultationContext) -> ConsultationSnapshot:
        raise FeatureNotImplementedError("问诊会话")

    async def update_consultation(
        self,
        consultation_id: str,
        payload: ConsultationUpdate,
    ) -> ConsultationSnapshot:
        raise FeatureNotImplementedError("问诊会话")

    async def list_records(self, consultation_id: str) -> list[RecordRead]:
        raise FeatureNotImplementedError("问诊记录")

    async def create_record(self, payload: RecordCreate) -> RecordRead:
        raise FeatureNotImplementedError("问诊记录")

    async def enter_diagnosis(self, context: ConsultationContext) -> TreatmentResult:
        raise FeatureNotImplementedError("诊断与处方")

    async def list_reports(self, patient_id: str) -> list[DiagnosisReport]:
        raise FeatureNotImplementedError("诊断报告")

    async def compare_reports(self, report_a_id: str, report_b_id: str) -> ReportComparison:
        raise FeatureNotImplementedError("报告对比")
