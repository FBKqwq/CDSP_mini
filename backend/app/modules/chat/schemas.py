import time
from typing import Literal

from pydantic import Field

from app.contracts.common import ApiModel


class ChatInstanceRead(ApiModel):
    instance_id: str = Field(alias="instanceId")


class ChatClientMessage(ApiModel):
    type: Literal["chat_message"] = "chat_message"
    content: str = Field(min_length=1)


StreamEventType = Literal[
    "thinking",
    "output_step",
    "tool_call",
    "tool_result",
    "output",
    "output_end",
    "chat_message",
    "stats",
    "error",
    "system",
]


class StreamEvent(ApiModel):
    id: str
    type: StreamEventType
    content: str | None = None
    step_number: str | None = Field(default=None, alias="stepNumber")
    step_name: str | None = Field(default=None, alias="stepName")
    timestamp: int = Field(default_factory=lambda: int(time.time() * 1000))
