from fastapi import APIRouter, Depends, Query

from app.contracts import ApiEnvelope, ConsultationContext, ok
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
    ReportComparisonRequest,
)
from app.modules.crud.service import CrudService, get_crud_service


router = APIRouter(prefix="/llm-chart", tags=["Clinical CRUD"])


@router.get("/patients", response_model=ApiEnvelope[list[PatientRead]])
async def list_patients(
    query: str | None = None,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[list[PatientRead]]:
    return ok(await service.list_patients(query))


@router.post("/patients", response_model=ApiEnvelope[PatientRead])
async def create_patient(
    payload: PatientCreate,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[PatientRead]:
    return ok(await service.create_patient(payload))


@router.delete("/patients/{patient_id}", response_model=ApiEnvelope[None])
async def delete_patient(
    patient_id: str,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[None]:
    await service.delete_patient(patient_id)
    return ok(None)


@router.get("/disease-groups", response_model=ApiEnvelope[list[DiseaseGroupRead]])
async def list_disease_groups(
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[list[DiseaseGroupRead]]:
    return ok(await service.list_disease_groups())


@router.get("/doctors", response_model=ApiEnvelope[list[DoctorRead]])
async def list_doctors(
    disease_group_id: str | None = Query(default=None, alias="diseaseGroupId"),
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[list[DoctorRead]]:
    return ok(await service.list_doctors(disease_group_id))


@router.get("/consultations", response_model=ApiEnvelope[ConsultationSnapshot | None])
async def get_consultation(
    patient_id: str = Query(alias="patientId"),
    disease_group_id: str = Query(alias="diseaseGroupId"),
    doctor_id: str = Query(alias="doctorId"),
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[ConsultationSnapshot | None]:
    return ok(await service.get_consultation(patient_id, disease_group_id, doctor_id))


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


@router.post("/diagnoses", response_model=ApiEnvelope[DiagnosisSummary])
async def enter_diagnosis(
    context: ConsultationContext,
    service: CrudService = Depends(get_crud_service),
) -> ApiEnvelope[DiagnosisSummary]:
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
