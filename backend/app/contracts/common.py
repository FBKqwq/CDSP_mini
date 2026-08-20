from enum import StrEnum
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field


class ApiModel(BaseModel):
    """Base DTO that keeps Python names and frontend camelCase aliases compatible."""

    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)


T = TypeVar("T")


class ApiEnvelope(ApiModel, Generic[T]):
    success: bool
    code: str
    message: str
    data: T | None = None


def ok(data: T) -> ApiEnvelope[T]:
    return ApiEnvelope(success=True, code="OK", message="", data=data)


class DiagnosisStage(StrEnum):
    CONSULTATION = "consultation"
    PRELIMINARY = "preliminary"
    COLLABORATION = "collaboration"
    COMPREHENSIVE = "comprehensive"


class ConsultationContext(ApiModel):
    session_version: int = Field(alias="sessionVersion", ge=0)
    patient_id: str = Field(alias="patientId", min_length=1)
    disease_group_id: str = Field(alias="diseaseGroupId", min_length=1)
    doctor_id: str = Field(alias="doctorId", min_length=1)
    consultation_id: str | None = Field(default=None, alias="consultationId")
    instance_id: str | None = Field(default=None, alias="instanceId")
    stage: DiagnosisStage = DiagnosisStage.CONSULTATION
