import threading
import time
from config.logging_config import get_logger

logger = get_logger(__name__)

# Thread-safe set to track API-initiated events (to prevent redundant processing)
# Structure: {(event_type, username, file_type, file_name): expiry_timestamp}
# event_type: 'delete', 'modify', 'create', 'rename'
_ignored_events = {}
_ignored_events_lock = threading.Lock()

_IGNORE_EXPIRY_SECONDS = 6  # How long to ignore an event after it's registered


def register_api_event(event_type, username, file_type, file_name):
    """
    Register an event that was initiated by the API to prevent the watcher
    from performing redundant processing.

    Args:
        event_type: Type of event ('delete', 'modify', 'create', 'rename', etc.)
        username: The username who owns the file
        file_type: 'experiments' or 'workflows'
        file_name: The name of the file (without extension)
    """
    key = (event_type, username, file_type, file_name)
    expiry = time.time() + _IGNORE_EXPIRY_SECONDS

    with _ignored_events_lock:
        _ignored_events[key] = expiry
        logger.debug(f"Registered API {event_type} to ignore: {key} (expires in {_IGNORE_EXPIRY_SECONDS}s)")


def should_ignore_event(event_type, username, file_type, file_name):
    """
    Check if an event should be ignored (because it was initiated by the API).
    Also cleans up expired entries.

    Args:
        event_type: Type of event ('delete', 'modify', 'create', 'rename', etc.)
        username: The username who owns the file
        file_type: 'experiments' or 'workflows'
        file_name: The name of the file (without extension)

    Returns:
        bool: True if event should be ignored, False otherwise
    """
    key = (event_type, username, file_type, file_name)
    current_time = time.time()

    with _ignored_events_lock:
        # Clean up expired entries
        expired_keys = [k for k, v in _ignored_events.items() if v < current_time]
        for expired_key in expired_keys:
            del _ignored_events[expired_key]
            logger.debug(f"Cleaned up expired event entry: {expired_key}")

        # Check if this event should be ignored
        if key in _ignored_events:
            # Don't delete - let it expire naturally to handle multiple rapid events from same file write
            logger.info(f"Ignoring API-initiated {event_type}: {key}")
            return True

    return False
