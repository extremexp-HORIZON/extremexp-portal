import asyncio
from collections import defaultdict
from uuid import UUID
import structlog
from typing import TypedDict
import enum

logger = structlog.get_logger(__name__)


class DBEventType(str, enum.Enum):
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"


class DBEvent(TypedDict):
    event_type: DBEventType
    document_type: str
    document_id: UUID
    user_id: UUID


class StreamManager:
    def __init__(self):
        self.active_connections: dict[UUID, list[asyncio.Queue]] = defaultdict(list)

    async def connect(self, user_id: UUID) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.active_connections[user_id].append(queue)
        logger.info("User connected to stream", user_id=str(user_id))
        return queue

    async def disconnect(self, user_id: UUID, queue: asyncio.Queue):
        if user_id in self.active_connections:
            if queue in self.active_connections[user_id]:
                self.active_connections[user_id].remove(queue)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info("User disconnected from stream", user_id=str(user_id))

    async def broadcast(self, payload: DBEvent):
        target_user_id = payload.get("user_id")

        if not target_user_id:
            logger.warning("Payload missing user_id", payload=payload)
            return

        if target_user_id in self.active_connections:
            for queue in self.active_connections[target_user_id]:
                await queue.put(payload)


stream_manager = StreamManager()
