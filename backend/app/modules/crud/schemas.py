from typing import Literal

from pydantic import Field

from app.contracts.common import ApiModel, ConsultationContext, DiagnosisStage


class PatientCreate(ApiModel):
    name: str = Field(min_length=1, max_length=80)
    gender: Literal["男", "女", "未知"]
    age: int | None = Field(default=None, ge=0, le=150)


class PatientRead(PatientCreate):
    id: str
    code: str


class DoctorRead(ApiModel):
    id: str
    name: str
    title: str
    specialty: str
    enabled: bool
    unavailable_reason: str | None = Field(default=None, alias="unavailableReason")


class DiseaseGroupRead(ApiModel):
    id: str
    name: str
    description: str
    doctors: list[DoctorRead] = Field(default_factory=list)


class ChatMessageRead(ApiModel):
    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    status: Literal["pending", "streaming", "sent", "failed"]
    created_at: int = Field(alias="createdAt")


class ConsultationSnapshot(ApiModel):
    id: str
    context: ConsultationContext
    messages: list[ChatMessageRead] = Field(default_factory=list)
    diagnosis: "DiagnosisSummary | None" = None


class ConsultationUpdate(ApiModel):
    stage: DiagnosisStage | None = None
    instance_id: str | None = Field(default=None, alias="instanceId")


class RecordCreate(ApiModel):
    consultation_id: str = Field(alias="consultationId", min_length=1)
    role: Literal["patient", "doctor"]
    content: str = Field(min_length=1)


class RecordRead(RecordCreate):
    id: str
    created_at: int = Field(alias="createdAt")


class SyndromeScore(ApiModel):
    name: str
    value: float
    max: float = Field(gt=0)


class DiagnosisSummary(ApiModel):
    primary_diagnosis: str = Field(alias="primaryDiagnosis")
    syndrome: str
    evidence: list[str] = Field(default_factory=list)
    advice: str
    updated_at: str = Field(alias="updatedAt")
    stage: DiagnosisStage
    syndrome_scores: list[SyndromeScore] = Field(default_factory=list, alias="syndromeScores")


class PrescriptionItem(ApiModel):
    medicine: str
    dosage: str
    usage: str


class Prescription(ApiModel):
    name: str
    items: list[PrescriptionItem] = Field(default_factory=list)
    instructions: str
    cautions: str | None = None


class DiagnosisReport(ApiModel):
    id: str
    patient_id: str = Field(alias="patientId")
    created_at: str = Field(alias="createdAt")
    disease_name: str = Field(alias="diseaseName")
    status: Literal["draft", "completed"]
    diagnosis: DiagnosisSummary
    prescription: Prescription | None = None


class ReportComparisonRequest(ApiModel):
    report_a_id: str = Field(alias="reportAId", min_length=1)
    report_b_id: str = Field(alias="reportBId", min_length=1)


class ReportComparisonItem(ApiModel):
    key: str
    label: str
    report_a: str = Field(alias="reportA")
    report_b: str = Field(alias="reportB")
    summary: str


class ReportComparison(ApiModel):
    report_a_id: str = Field(alias="reportAId")
    report_b_id: str = Field(alias="reportBId")
    items: list[ReportComparisonItem] = Field(default_factory=list)
