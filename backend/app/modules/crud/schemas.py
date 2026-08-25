

from datetime import date
from typing import Any, Literal

from pydantic import Field, field_validator

from app.contracts.common import ApiModel, ConsultationContext, DiagnosisStage

class PatientProfileRead(ApiModel):
    id: str
    code: str
    name: str
    gender: Literal["男", "女", "未知"]
    birth_date: date | None = Field(default=None, alias="birthDate")
    age: int | None = Field(default=None, ge=0, le=150)
    lock_version: int = Field(alias="lockVersion", ge=0)


class PatientProfileUpdate(ApiModel):
    name: str = Field(min_length=1, max_length=80)
    gender: Literal["男", "女", "未知"]
    birth_date: date | None = Field(default=None, alias="birthDate")
    lock_version: int = Field(alias="lockVersion", ge=0)

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("birth_date")
    @classmethod
    def validate_birth_date(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("出生日期不得晚于当前日期")
        return value

class ConsultationExpertRead(ApiModel):
    id: str
    name: str
    title: str
    specialty: str
    enabled: bool
    unavailable_reason: str | None = Field(default=None, alias="unavailableReason")


class MedicalHistoryRead(ApiModel):
    id: str
    name: str
    description: str | None = None
    diagnosed_at: date | None = Field(
        default=None,
        alias="diagnosedAt",
    )
    lock_version: int = Field(
        alias="lockVersion",
        ge=0,
    )


class MedicalHistoryCreate(ApiModel):
    name: str = Field(
        min_length=1,
        max_length=80,
    )
    description: str | None = Field(
        default=None,
        max_length=500,
    )
    diagnosed_at: date | None = Field(
        default=None,
        alias="diagnosedAt",
    )

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("description", mode="before")
    @classmethod
    def normalize_description(cls, value: Any) -> Any:
        if isinstance(value, str):
            value = value.strip()
            return value or None
        return value

    @field_validator("diagnosed_at")
    @classmethod
    def validate_diagnosed_at(
        cls,
        value: date | None,
    ) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("诊断日期不得晚于当前日期")
        return value


class MedicalHistoryUpdate(MedicalHistoryCreate):
    lock_version: int = Field(
        alias="lockVersion",
        ge=0,
    )
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
    prescription: "Prescription | None" = None


class ConsultationUpdate(ApiModel):
    stage: DiagnosisStage | None = None
    instance_id: str | None = Field(default=None, alias="instanceId")


class RecordCreate(ApiModel):
    consultation_id: str = Field(alias="consultationId", min_length=1)
    role: Literal["patient", "assistant"]
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


class TreatmentResult(ApiModel):
    diagnosis: DiagnosisSummary
    prescription: Prescription | None = None


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
