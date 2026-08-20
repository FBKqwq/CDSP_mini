from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


def build_client() -> TestClient:
    return TestClient(
        create_app(
            Settings(
                app_name="CDSP Mini Test API",
                environment="test",
                cors_origins=(),
            )
        )
    )


def consultation_context() -> dict[str, object]:
    return {
        "sessionVersion": 1,
        "patientId": "patient-1",
        "diseaseGroupId": "disease-1",
        "doctorId": "doctor-1",
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


def test_crud_route_is_present_but_not_faked() -> None:
    response = build_client().get("/api/v1/llm-chart/patients")

    assert response.status_code == 501
    assert response.json()["code"] == "NOT_IMPLEMENTED"
    assert "CRUD" in response.json()["message"]


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

    crud_operation = schema["paths"]["/api/v1/llm-chart/patients"]["get"]
    chat_operation = schema["paths"]["/api/v1/llm-chart/chat/instances"]["post"]
    assert crud_operation["tags"] == ["Clinical CRUD"]
    assert chat_operation["tags"] == ["LLM Chat"]


def test_websocket_route_reports_missing_provider_explicitly() -> None:
    client = build_client()

    with client.websocket_connect(
        "/ws/v1/llm-chart/stream?instanceId=instance-1"
    ) as websocket:
        event = websocket.receive_json()

    assert event["type"] == "error"
    assert "大模型对话提供方" in event["content"]
