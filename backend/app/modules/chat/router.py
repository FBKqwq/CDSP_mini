import uuid

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.contracts import ApiEnvelope, ConsultationContext, ok
from app.core.errors import FeatureNotImplementedError
from app.modules.chat.schemas import ChatClientMessage, ChatInstanceRead, StreamEvent
from app.modules.chat.service import ChatService, get_chat_service


http_router = APIRouter(prefix="/llm-chart/chat", tags=["LLM Chat"])
websocket_router = APIRouter(prefix="/ws/v1/llm-chart", tags=["LLM Chat"])


@http_router.post("/instances", response_model=ApiEnvelope[ChatInstanceRead])
async def create_chat_instance(
    context: ConsultationContext,
    service: ChatService = Depends(get_chat_service),
) -> ApiEnvelope[ChatInstanceRead]:
    return ok(await service.create_instance(context))


def _error_event(message: str) -> StreamEvent:
    return StreamEvent(id=f"event-{uuid.uuid4()}", type="error", content=message)


@websocket_router.websocket("/stream")
async def stream_chat(
    websocket: WebSocket,
    instance_id: str = Query(alias="instanceId"),
) -> None:
    await websocket.accept()
    service = get_chat_service()

    try:
        service.ensure_ready()
        while True:
            raw_message = await websocket.receive_text()
            try:
                message = ChatClientMessage.model_validate_json(raw_message)
            except ValidationError:
                await websocket.send_text(
                    _error_event("消息格式不符合约定").model_dump_json(by_alias=True)
                )
                continue

            async for event in service.stream_message(instance_id, message.content):
                await websocket.send_text(event.model_dump_json(by_alias=True))
    except FeatureNotImplementedError as exc:
        await websocket.send_text(_error_event(str(exc)).model_dump_json(by_alias=True))
        await websocket.close(code=1011, reason="chat provider not configured")
    except WebSocketDisconnect:
        return
