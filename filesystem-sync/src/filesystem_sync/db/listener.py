"""
PostgreSQL LISTEN/NOTIFY listener for database change events.

Listens to the 'db_events' channel for INSERT/UPDATE/DELETE notifications
on experiment and workflow tables.
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from enum import Enum
from uuid import UUID

import asyncpg_listen
import structlog

from filesystem_sync.config import get_config

logger = structlog.get_logger(__name__)


class DBEventType(str, Enum):
    """Database event types."""

    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


@dataclass(frozen=True)
class DBEvent:
    """Represents a database change event."""

    table: str  # "experiment" or "workflow"
    action: DBEventType
    entity_id: UUID
    user_id: UUID
    name: str | None = None  # Optional: included when available (especially for DELETE)


# Type alias for event handlers
DBEventHandler = Callable[[DBEvent], Awaitable[None]]


class DatabaseListener:
    """
    Listens to PostgreSQL NOTIFY events on the 'db_events' channel.

    Events are fired by triggers when experiments/workflows are modified.
    """

    def __init__(self, handler: DBEventHandler):
        """
        Initialize the listener.

        Args:
            handler: Async function to call when a database event is received
        """
        self.handler = handler
        self._running = False
        self._task: asyncio.Task | None = None

    async def _handle_notification(
        self, notification: asyncpg_listen.NotificationOrTimeout
    ) -> None:
        """Handle a notification from PostgreSQL."""
        if isinstance(notification, asyncpg_listen.Timeout):
            return

        if notification.payload is None:
            return

        logger.debug(
            "Received DB notification",
            channel=notification.channel,
            payload=notification.payload,
        )

        try:
            data = json.loads(notification.payload)

            # Parse the event
            table = data.get("table")
            action_str = data.get("action")

            # Only handle experiment and workflow events
            if table not in ("experiment", "workflow"):
                return

            # Parse action
            try:
                action = DBEventType(action_str)
            except ValueError:
                logger.warning("Unknown action in DB event", action=action_str)
                return

            # Parse UUIDs
            try:
                entity_id = UUID(data["id"])
                user_id = UUID(data["user_id"])
            except (KeyError, ValueError) as e:
                logger.warning("Invalid UUID in DB event", error=str(e), data=data)
                return

            # Extract name if present (optional, for backward compatibility)
            name = data.get("name")

            event = DBEvent(
                table=table,
                action=action,
                entity_id=entity_id,
                user_id=user_id,
                name=name,
            )

            # Call the handler
            await self.handler(event)

        except json.JSONDecodeError:
            logger.error(
                "Failed to decode DB notification payload", payload=notification.payload
            )
        except Exception as e:
            logger.error(
                "Error processing DB notification", error=str(e), exc_info=True
            )

    async def _run_listener(self) -> None:
        """Run the listener loop with reconnection handling."""
        config = get_config()

        listener = asyncpg_listen.NotificationListener(
            asyncpg_listen.connect_func(dsn=config.postgres.dsn)
        )

        logger.info("Starting database listener on channel 'db_events'")

        while self._running:
            try:
                await listener.run(
                    {"db_events": self._handle_notification},
                    policy=asyncpg_listen.ListenPolicy.ALL,
                    notification_timeout=30,
                )
            except asyncio.CancelledError:
                logger.info("Database listener cancelled")
                break
            except Exception as e:
                if self._running:
                    logger.error(
                        "Database listener error, retrying in 5s...", error=str(e)
                    )
                    await asyncio.sleep(5)
                else:
                    break

    async def start(self) -> None:
        """Start the database listener in a background task."""
        if self._running:
            logger.warning("Database listener already running")
            return

        self._running = True
        self._task = asyncio.create_task(self._run_listener())
        logger.info("Database listener started")

    async def stop(self) -> None:
        """Stop the database listener."""
        if not self._running:
            return

        self._running = False

        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            self._task = None

        logger.info("Database listener stopped")
