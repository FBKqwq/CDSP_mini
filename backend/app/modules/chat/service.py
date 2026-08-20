from collections.abc import AsyncIterator
from functools import lru_cache

from app.contracts import ConsultationContext
from app.core.errors import FeatureNotImplementedError
from app.modules.chat.ports import ChatProvider
from app.modules.chat.schemas import ChatInstanceRead, StreamEvent


class ChatService:
    def __init__(self, provider: ChatProvider | None = None) -> None:
        self._provider_adapter = provider

    def _provider(self) -> ChatProvider:
        if self._provider_adapter is None:
            raise FeatureNotImplementedError("大模型对话提供方")
        return self._provider_adapter

    def ensure_ready(self) -> None:
        self._provider()

    async def create_instance(self, context: ConsultationContext) -> ChatInstanceRead:
        return await self._provider().create_instance(context)

    async def stream_message(self, instance_id: str, content: str) -> AsyncIterator[StreamEvent]:
        async for event in self._provider().stream_message(instance_id, content):
            yield event


@lru_cache
def get_chat_service() -> ChatService:
    # Replace this with an injected LLM/agent adapter during the chat integration stage.
    return ChatService(provider=None)
