from fastapi import APIRouter, Depends, Query

from app.db.models import AppUser
from app.modules.auth.dependencies import get_current_user
from app.modules.crud.medical_history_service import (
    MedicalHistoryService,
    get_medical_history_service,
)

from app.modules.crud.medical_history_service import (
    MedicalHistoryService,
    get_medical_history_service,
)

from app.db.models import AppUser
from app.modules.auth.dependencies import get_current_user
from app.modules.crud.patient_profile_service import (
    PatientProfileService,
    get_patient_profile_service,
)

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


@router.get(
    "/patient-profile",
    response_model=ApiEnvelope[PatientProfileRead],
)
def get_patient_profile(
    current_user: AppUser = Depends(get_current_user),
    service: PatientProfileService = Depends(get_patient_profile_service),
) -> ApiEnvelope[PatientProfileRead]:
    return ok(
        service.get_patient_profile(current_user)
    )


@router.put(
    "/patient-profile",
    response_model=ApiEnvelope[PatientProfileRead],
)
def update_patient_profile(
    payload: PatientProfileUpdate,
    current_user: AppUser = Depends(get_current_user),
    service: PatientProfileService = Depends(get_patient_profile_service),
) -> ApiEnvelope[PatientProfileRead]:
    return ok(
        service.update_patient_profile(
            current_user,
            payload,
        )
    )

@router.get(
    "/medical-histories",
    response_model=ApiEnvelope[list[MedicalHistoryRead]],
)
def list_medical_histories(
    current_user: AppUser = Depends(get_current_user),
    service: MedicalHistoryService = Depends(get_medical_history_service),
) -> ApiEnvelope[list[MedicalHistoryRead]]:
    return ok(
        service.list_medical_histories(current_user)
    )

@router.post(
    "/medical-histories",
    response_model=ApiEnvelope[MedicalHistoryRead],
)
def create_medical_history(
    payload: MedicalHistoryCreate,
    current_user: AppUser = Depends(get_current_user),
    service: MedicalHistoryService = Depends(get_medical_history_service),
) -> ApiEnvelope[MedicalHistoryRead]:
    return ok(
        service.create_medical_history(
            current_user,
            payload,
        )
    )

@router.put(
    "/medical-histories/{history_id}",
    response_model=ApiEnvelope[MedicalHistoryRead],
)
def update_medical_history(
    history_id: str,
    payload: MedicalHistoryUpdate,
    current_user: AppUser = Depends(get_current_user),
    service: MedicalHistoryService = Depends(get_medical_history_service),
) -> ApiEnvelope[MedicalHistoryRead]:
    return ok(
        service.update_medical_history(
            current_user,
            history_id,
            payload,
        )
    )

@router.delete(
    "/medical-histories/{history_id}",
    response_model=ApiEnvelope[None],
)
def delete_medical_history(
    history_id: str,
    current_user: AppUser = Depends(get_current_user),
    service: MedicalHistoryService = Depends(get_medical_history_service),
) -> ApiEnvelope[None]:
    service.delete_medical_history(
        current_user,
        history_id,
    )

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
