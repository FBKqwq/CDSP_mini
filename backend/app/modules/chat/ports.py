from collections.abc import AsyncIterator
from typing import Protocol

from app.contracts import ConsultationContext
from app.modules.chat.schemas import ChatInstanceRead, StreamEvent


class ChatProvider(Protocol):
    """Boundary implemented by the selected agent/LLM platform adapter."""

    async def create_instance(self, context: ConsultationContext) -> ChatInstanceRead: ...

    def stream_message(self, instance_id: str, content: str) -> AsyncIterator[StreamEvent]: ...
