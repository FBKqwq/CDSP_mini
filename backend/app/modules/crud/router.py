from fastapi import APIRouter, Depends, Query

from app.contracts import ApiEnvelope, ConsultationContext, ok
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
    ReportComparisonRequest,
    TreatmentResult,
)
from app.modules.crud.service import CrudService, get_crud_service


router = APIRouter(prefix="/llm-chart", tags=["Clinical CRUD"])


@router.get("/patient-profile", response_model=ApiEnvelope[PatientProfileRead])
async def get_patient_profile(
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[PatientProfileRead]:
    return ok(await service.get_patient_profile())


@router.put("/patient-profile", response_model=ApiEnvelope[PatientProfileRead])
async def update_patient_profile(
    payload: PatientProfileUpdate,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[PatientProfileRead]:
    return ok(await service.update_patient_profile(payload))


@router.get("/medical-histories", response_model=ApiEnvelope[list[MedicalHistoryRead]])
async def list_medical_histories(
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[list[MedicalHistoryRead]]:
    return ok(await service.list_medical_histories())


@router.post("/medical-histories", response_model=ApiEnvelope[MedicalHistoryRead])
async def create_medical_history(
    payload: MedicalHistoryCreate,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[MedicalHistoryRead]:
    return ok(await service.create_medical_history(payload))


@router.put("/medical-histories/{history_id}", response_model=ApiEnvelope[MedicalHistoryRead])
async def update_medical_history(
    history_id: str,
    payload: MedicalHistoryUpdate,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[MedicalHistoryRead]:
    return ok(await service.update_medical_history(history_id, payload))


@router.delete("/medical-histories/{history_id}", response_model=ApiEnvelope[None])
async def delete_medical_history(
    history_id: str,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[None]:
    await service.delete_medical_history(history_id)
    return ok(None)


@router.get("/consultation-experts", response_model=ApiEnvelope[list[ConsultationExpertRead]])
async def list_consultation_experts(
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[list[ConsultationExpertRead]]:
    return ok(await service.list_consultation_experts())


@router.get("/consultations", response_model=ApiEnvelope[ConsultationSnapshot | None])
async def get_consultation(
    patient_id: str = Query(alias="patientId"),
    medical_history_id: str | None = Query(default=None, alias="medicalHistoryId"),
    expert_id: str = Query(alias="expertId"),
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[ConsultationSnapshot | None]:
    return ok(await service.get_consultation(patient_id, medical_history_id, expert_id))


@router.post("/consultations", response_model=ApiEnvelope[ConsultationSnapshot])
async def create_consultation(
    context: ConsultationContext,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[ConsultationSnapshot]:
    return ok(await service.create_consultation(context))


@router.put("/consultations/{consultation_id}", response_model=ApiEnvelope[ConsultationSnapshot])
async def update_consultation(
    consultation_id: str,
    payload: ConsultationUpdate,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[ConsultationSnapshot]:
    return ok(await service.update_consultation(consultation_id, payload))


@router.get("/records", response_model=ApiEnvelope[list[RecordRead]])
async def list_records(
    consultation_id: str = Query(alias="consultationId"),
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[list[RecordRead]]:
    return ok(await service.list_records(consultation_id))


@router.post("/records", response_model=ApiEnvelope[RecordRead])
async def create_record(
    payload: RecordCreate,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[RecordRead]:
    return ok(await service.create_record(payload))


@router.post("/diagnoses", response_model=ApiEnvelope[TreatmentResult])
async def enter_diagnosis(
    context: ConsultationContext,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[TreatmentResult]:
    return ok(await service.enter_diagnosis(context))


@router.get("/reports", response_model=ApiEnvelope[list[DiagnosisReport]])
async def list_reports(
    patient_id: str = Query(alias="patientId"),
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[list[DiagnosisReport]]:
    return ok(await service.list_reports(patient_id))


@router.post("/reports/compare", response_model=ApiEnvelope[ReportComparison])
async def compare_reports(
    payload: ReportComparisonRequest,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[ReportComparison]:
    return ok(await service.compare_reports(payload.report_a_id, payload.report_b_id))
