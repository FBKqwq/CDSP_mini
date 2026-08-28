from fastapi.testclient import TestClient

from app.container import get_crud_service
from app.core.config import Settings
from app.core.errors import HistoryNotFoundError, VersionConflictError
from app.main import create_app
from app.modules.auth.router import require_current_user
from app.modules.auth.schemas import UserSummary
from app.modules.crud.schemas import (
    MedicalHistoryCreate,
    MedicalHistoryRead,
    MedicalHistoryUpdate,
    PatientProfileRead,
    PatientProfileUpdate,
)
from app.modules.crud.service import CrudService


class StubClinicalRepository:
    def __init__(self) -> None:
        self.profile = PatientProfileRead(
            id="patient-1",
            code="P001",
            name="测试患者",
            gender="未知",
            birth_date="1990-01-01",
            age=36,
            lock_version=0,
        )
        self.histories: dict[str, MedicalHistoryRead] = {}

    async def get_patient_profile(self, user_id: str) -> PatientProfileRead:
        assert user_id == "user-1"
        return self.profile

    async def update_patient_profile(
        self,
        user_id: str,
        payload: PatientProfileUpdate,
    ) -> PatientProfileRead:
        assert user_id == "user-1"
        if payload.lock_version != self.profile.lock_version:
            raise VersionConflictError()
        self.profile = PatientProfileRead(
            id=self.profile.id,
            code=self.profile.code,
            name=payload.name,
            gender=payload.gender,
            birth_date=payload.birth_date,
            age=36,
            lock_version=self.profile.lock_version + 1,
        )
        return self.profile

    async def list_medical_histories(self, user_id: str) -> list[MedicalHistoryRead]:
        assert user_id == "user-1"
        return list(self.histories.values())

    async def create_medical_history(
        self,
        user_id: str,
        payload: MedicalHistoryCreate,
    ) -> MedicalHistoryRead:
        assert user_id == "user-1"
        history = MedicalHistoryRead(
            id=f"history-{len(self.histories) + 1}",
            name=payload.name,
            description=payload.description,
            diagnosed_at=payload.diagnosed_at,
            lock_version=0,
        )
        self.histories[history.id] = history
        return history

    async def update_medical_history(
        self,
        user_id: str,
        history_id: str,
        payload: MedicalHistoryUpdate,
    ) -> MedicalHistoryRead:
        assert user_id == "user-1"
        current = self.histories.get(history_id)
        if current is None:
            raise HistoryNotFoundError()
        if payload.lock_version != current.lock_version:
            raise VersionConflictError()
        updated = MedicalHistoryRead(
            id=history_id,
            name=payload.name,
            description=payload.description,
            diagnosed_at=payload.diagnosed_at,
            lock_version=current.lock_version + 1,
        )
        self.histories[history_id] = updated
        return updated

    async def delete_medical_history(self, user_id: str, history_id: str) -> None:
        assert user_id == "user-1"
        self.histories.pop(history_id, None)


def build_client() -> TestClient:
    app = create_app(
        Settings(
            app_name="CDSP Mini Test API",
            environment="test",
            cors_origins=(),
        )
    )
    app.dependency_overrides[require_current_user] = lambda: UserSummary(
        id="user-1",
        display_name="测试用户",
        role="patient",
    )
    clinical_service = CrudService(repository=StubClinicalRepository())
    app.dependency_overrides[get_crud_service] = lambda: clinical_service
    return TestClient(app)


def consultation_context() -> dict[str, object]:
    return {
        "sessionVersion": 1,
        "patientId": "patient-1",
        "expertId": "expert-1",
        "stage": "consultation",
    }


def test_health_returns_standard_envelope() -> None:
    response = build_client().get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "code": "OK",
        "message": "",
        "data": {
            "status": "ok",
            "service": "CDSP Mini Test API",
            "version": "0.1.0",
            "environment": "test",
        },
    }


def test_profile_route_returns_current_users_profile() -> None:
    response = build_client().get("/api/v1/llm-chart/patient-profile")

    assert response.status_code == 200
    assert response.json()["data"] == {
        "id": "patient-1",
        "code": "P001",
        "name": "测试患者",
        "gender": "未知",
        "birthDate": "1990-01-01",
        "age": 36,
        "lockVersion": 0,
    }


def test_profile_update_uses_birth_date_and_lock_version() -> None:
    response = build_client().put(
        "/api/v1/llm-chart/patient-profile",
        json={
            "name": " 李女士 ",
            "gender": "女",
            "birthDate": "1990-01-01",
            "lockVersion": 0,
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["name"] == "李女士"
    assert response.json()["data"]["lockVersion"] == 1


def test_profile_update_rejects_stale_lock_version() -> None:
    client = build_client()
    payload = {
        "name": "李女士",
        "gender": "女",
        "birthDate": "1990-01-01",
        "lockVersion": 0,
    }

    assert client.put("/api/v1/llm-chart/patient-profile", json=payload).status_code == 200
    conflict = client.put("/api/v1/llm-chart/patient-profile", json=payload)

    assert conflict.status_code == 409
    assert conflict.json()["code"] == "VERSION_CONFLICT"


def test_medical_history_crud_contract_is_present() -> None:
    client = build_client()
    payload = {
        "name": "慢性胃炎",
        "description": "偶有胃胀",
        "diagnosedAt": "2026-01-08",
    }

    created = client.post("/api/v1/llm-chart/medical-histories", json=payload)
    assert created.status_code == 200
    assert created.json()["data"]["lockVersion"] == 0

    updated = client.put(
        "/api/v1/llm-chart/medical-histories/history-1",
        json={**payload, "lockVersion": 0},
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["lockVersion"] == 1
    assert client.delete("/api/v1/llm-chart/medical-histories/history-1").status_code == 200
    assert client.delete("/api/v1/llm-chart/medical-histories/history-1").status_code == 200


def test_medical_history_name_is_required() -> None:
    response = build_client().post(
        "/api/v1/llm-chart/medical-histories",
        json={"name": ""},
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"


def test_future_profile_and_diagnosis_dates_are_rejected() -> None:
    client = build_client()
    profile_response = client.put(
        "/api/v1/llm-chart/patient-profile",
        json={
            "name": "测试患者",
            "gender": "未知",
            "birthDate": "2999-01-01",
            "lockVersion": 0,
        },
    )
    history_response = client.post(
        "/api/v1/llm-chart/medical-histories",
        json={"name": "高血压", "diagnosedAt": "2999-01-01"},
    )

    assert profile_response.status_code == 422
    assert history_response.status_code == 422


def test_profile_and_history_reject_forged_patient_id() -> None:
    client = build_client()
    profile_response = client.put(
        "/api/v1/llm-chart/patient-profile",
        json={
            "name": "测试患者",
            "gender": "未知",
            "birthDate": None,
            "lockVersion": 0,
            "patientId": "another-patient",
        },
    )
    history_response = client.post(
        "/api/v1/llm-chart/medical-histories",
        json={"name": "高血压", "patientId": "another-patient"},
    )

    assert profile_response.status_code == 422
    assert history_response.status_code == 422
    assert profile_response.json()["code"] == "VALIDATION_ERROR"
    assert history_response.json()["code"] == "VALIDATION_ERROR"


def test_chat_route_is_present_but_not_faked() -> None:
    response = build_client().post(
        "/api/v1/llm-chart/chat/instances",
        json=consultation_context(),
    )

    assert response.status_code == 501
    assert response.json()["code"] == "NOT_IMPLEMENTED"
    assert "大模型" in response.json()["message"]


def test_validation_uses_standard_error_envelope() -> None:
    response = build_client().post(
        "/api/v1/llm-chart/chat/instances",
        json={"sessionVersion": 1},
    )

    assert response.status_code == 422
    assert response.json() == {
        "success": False,
        "code": "VALIDATION_ERROR",
        "message": "请求参数校验失败",
        "data": None,
    }


def test_openapi_keeps_crud_and_chat_as_separate_capabilities() -> None:
    schema = build_client().get("/openapi.json").json()

    crud_operation = schema["paths"]["/api/v1/llm-chart/patient-profile"]["get"]
    profile_update = schema["paths"]["/api/v1/llm-chart/patient-profile"]["put"]
    history_create = schema["paths"]["/api/v1/llm-chart/medical-histories"]["post"]
    chat_operation = schema["paths"]["/api/v1/llm-chart/chat/instances"]["post"]
    treatment_schema = schema["paths"]["/api/v1/llm-chart/diagnoses"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
    assert crud_operation["tags"] == ["Clinical CRUD"]
    assert profile_update["tags"] == ["Clinical CRUD"]
    assert history_create["tags"] == ["Clinical CRUD"]
    assert chat_operation["tags"] == ["LLM Chat"]
    assert treatment_schema["$ref"].endswith("ApiEnvelope_TreatmentResult_")


def test_chat_context_allows_an_empty_medical_history() -> None:
    response = build_client().post(
        "/api/v1/llm-chart/chat/instances",
        json=consultation_context(),
    )

    assert response.status_code == 501
    assert response.json()["code"] == "NOT_IMPLEMENTED"


def test_websocket_route_reports_missing_provider_explicitly() -> None:
    client = build_client()

    with client.websocket_connect(
        "/ws/v1/llm-chart/stream?instanceId=instance-1"
    ) as websocket:
        event = websocket.receive_json()

    assert event["type"] == "error"
    assert "大模型对话提供方" in event["content"]
