"""
Event registry for preventing infinite sync loops.

When a file change triggers a database update, we register the event
so that the resulting database notification doesn't trigger another file write.
Similarly, when a database change triggers a file write, we register the event
so that the resulting file watcher event doesn't trigger another database update.
"""

from __future__ import annotations

import threading
import time
from typing import Literal

import structlog

from filesystem_sync.config import get_config

logger = structlog.get_logger(__name__)


EventType = Literal["create", "modify", "delete", "rename"]
FileType = Literal["experiments", "workflows"]


class EventRegistry:
    """
    Thread-safe registry for tracking events that should be ignored.

    Uses time-based expiry to automatically clean up old entries.
    """

    def __init__(self, expiry_seconds: float | None = None):
        """
        Initialize the event registry.

        Args:
            expiry_seconds: How long events should be ignored (default from config)
        """
        if expiry_seconds is None:
            expiry_seconds = get_config().ignore_expiry_seconds

        self._expiry_seconds = expiry_seconds
        self._events: dict[tuple[EventType, str, FileType, str], float] = {}
        self._lock = threading.Lock()

    def register(
        self,
        event_type: EventType,
        username: str,
        file_type: FileType,
        file_name: str,
    ) -> None:
        """
        Register an event to be ignored for the configured expiry period.

        Args:
            event_type: Type of event (create, modify, delete, rename)
            username: Username who owns the file
            file_type: Type of file (experiments or workflows)
            file_name: Name of the file (without .xxp extension)
        """
        key = (event_type, username, file_type, file_name)
        expiry = time.time() + self._expiry_seconds

        with self._lock:
            self._events[key] = expiry
            logger.debug(
                "Registered event to ignore",
                event_type=event_type,
                username=username,
                file_type=file_type,
                file_name=file_name,
                expiry_seconds=self._expiry_seconds,
            )

    def should_ignore(
        self,
        event_type: EventType,
        username: str,
        file_type: FileType,
        file_name: str,
    ) -> bool:
        """
        Check if an event should be ignored (was recently registered).

        Also cleans up expired entries.

        Args:
            event_type: Type of event (create, modify, delete, rename)
            username: Username who owns the file
            file_type: Type of file (experiments or workflows)
            file_name: Name of the file (without .xxp extension)

        Returns:
            True if the event should be ignored, False otherwise
        """
        key = (event_type, username, file_type, file_name)
        current_time = time.time()

        with self._lock:
            # Clean up expired entries
            expired_keys = [k for k, v in self._events.items() if v < current_time]
            for expired_key in expired_keys:
                del self._events[expired_key]
                logger.debug("Cleaned up expired event entry", key=expired_key)

            # Check if this event should be ignored
            if key in self._events:
                logger.info(
                    "Ignoring event (recently registered)",
                    event_type=event_type,
                    username=username,
                    file_type=file_type,
                    file_name=file_name,
                )
                return True

        return False

    def clear(self) -> None:
        """Clear all registered events."""
        with self._lock:
            self._events.clear()
            logger.debug("Cleared event registry")

    def __len__(self) -> int:
        """Return the number of registered events."""
        with self._lock:
            return len(self._events)


# Global event registry instance
_registry: EventRegistry | None = None


def get_event_registry() -> EventRegistry:
    """Get or create the global event registry."""
    global _registry
    if _registry is None:
        _registry = EventRegistry()
    return _registry


def reset_event_registry() -> None:
    """Reset the global event registry (useful for testing)."""
    global _registry
    _registry = None
