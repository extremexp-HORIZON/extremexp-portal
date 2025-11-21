import asyncio
import json
import asyncpg_listen
import structlog
from database import build_async_database_url
from stream_manager import stream_manager, DBEvent, DBEventType
from uuid import UUID

logger = structlog.get_logger(__name__)


def convert_pg_notification_to_user_event(payload: str) -> DBEvent:
    data = json.loads(payload)
    try:
        document_id = UUID(data["id"])
        target_user_id = UUID(data["user_id"])
    except ValueError:
        logger.warning(
            "Invalid UUID in payload", user_id=data["user_id"], id=data["id"]
        )
        raise

    action = data["action"]
    if action == "INSERT":
        event_type = DBEventType.CREATED
    elif action == "UPDATE":
        event_type = DBEventType.UPDATED
    elif action == "DELETE" or action == "TRUNCATE":
        event_type = DBEventType.DELETED
    else:
        logger.warning("Unknown action in payload", action=action)
        raise ValueError(f"Unknown action: {action}")

    return DBEvent(
        document_type=data["table"],
        document_id=document_id,
        user_id=target_user_id,
        event_type=event_type,
    )


async def handle_notifications(
    notification: asyncpg_listen.NotificationOrTimeout,
) -> None:
    if isinstance(notification, asyncpg_listen.Timeout):
        return

    logger.debug(
        f"Received notification on channel {notification.channel}",
        payload=notification.payload,
    )
    if notification.payload is None:
        return

    try:
        payload = notification.payload
        event = convert_pg_notification_to_user_event(payload)
        await stream_manager.broadcast(event)
    except json.JSONDecodeError:
        logger.error(
            "Failed to decode notification payload", payload=notification.payload
        )
        raise
    except Exception as e:
        logger.error("Error processing notification", error=str(e))
        raise


async def start_db_listener():
    db_url = build_async_database_url().replace("+asyncpg", "")

    listener = asyncpg_listen.NotificationListener(
        asyncpg_listen.connect_func(dsn=db_url)
    )

    logger.info("Starting DB listener...")
    # We run this in a loop to handle reconnections if the listener crashes completely
    # although asyncpg-listen handles some reconnection logic.
    while True:
        try:
            await listener.run(
                {"db_events": handle_notifications},
                policy=asyncpg_listen.ListenPolicy.ALL,
                notification_timeout=30,
            )
        except asyncio.CancelledError:
            logger.info("DB listener cancelled")
            break
        except Exception as e:
            logger.error("DB listener error, retrying in 5s...", error=str(e))
            await asyncio.sleep(5)
