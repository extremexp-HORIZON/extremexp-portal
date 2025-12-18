"""
Main application orchestration for filesystem-sync service.

This module ties together all the components:
- File watcher
- Database listener
- Bidirectional sync logic
- Initial synchronization
"""

from __future__ import annotations

import asyncio
import signal

import structlog

from filesystem_sync.config import get_config
from filesystem_sync.conversion import close_conversion_client, close_emf_client
from filesystem_sync.db import (
    DatabaseListener,
    DBEvent,
    close_db,
)
from filesystem_sync.filesystem import FileSystemWatcher
from filesystem_sync.security import PathInfo
from filesystem_sync.sync import (
    DatabaseToFileSync,
    FileToDatabaseSync,
    InitialSync,
    SyncMode,
)

logger = structlog.get_logger(__name__)


class Application:
    """
    Main application class that orchestrates all filesystem-sync components.
    """

    def __init__(self):
        """Initialize the application."""
        self._config = get_config()
        self._watcher: FileSystemWatcher | None = None
        self._db_listener: DatabaseListener | None = None
        self._file_to_db_sync: FileToDatabaseSync | None = None
        self._db_to_file_sync: DatabaseToFileSync | None = None
        self._shutdown_event = asyncio.Event()
        self._running = False

    async def start(self, sync_mode: SyncMode | None = None) -> None:
        """
        Start the application.

        Args:
            sync_mode: Override sync mode from config
        """
        if self._running:
            logger.warning("Application already running")
            return

        logger.info(
            "Starting filesystem-sync service",
            workspace=str(self._config.workspace_path),
            sync_mode=(sync_mode or SyncMode(self._config.sync_mode.value)).value,
        )

        try:
            # Initialize components
            self._file_to_db_sync = FileToDatabaseSync()
            self._db_to_file_sync = DatabaseToFileSync()

            # Get the current event loop
            loop = asyncio.get_running_loop()

            # Initialize file watcher
            self._watcher = FileSystemWatcher(
                workspace_path=self._config.workspace_path,
                sync_callback=self._handle_file_event,
                loop=loop,
            )

            # Initialize database listener
            self._db_listener = DatabaseListener(
                handler=self._handle_db_event,
            )

            # Run initial sync
            mode = sync_mode or SyncMode(self._config.sync_mode.value)
            initial_sync = InitialSync()
            stats = await initial_sync.run(mode)
            logger.info("Initial sync completed", stats=stats)

            # Start file watcher
            self._watcher.start()

            # Start database listener
            await self._db_listener.start()

            self._running = True
            logger.info("Filesystem-sync service started successfully")

        except Exception as e:
            logger.error("Failed to start application", error=str(e), exc_info=True)
            await self.stop()
            raise

    async def stop(self) -> None:
        """Stop the application gracefully."""
        if not self._running:
            return

        logger.info("Stopping filesystem-sync service...")

        # Stop file watcher
        if self._watcher is not None:
            try:
                self._watcher.stop()
            except Exception as e:
                logger.error("Error stopping file watcher", error=str(e))

        # Stop database listener
        if self._db_listener is not None:
            try:
                await self._db_listener.stop()
            except Exception as e:
                logger.error("Error stopping database listener", error=str(e))

        # Close conversion client
        try:
            await close_conversion_client()
        except Exception as e:
            logger.error("Error closing conversion client", error=str(e))

        # Close EMF client
        try:
            await close_emf_client()
        except Exception as e:
            logger.error("Error closing EMF client", error=str(e))

        # Close database connection
        try:
            await close_db()
        except Exception as e:
            logger.error("Error closing database", error=str(e))

        self._running = False
        self._shutdown_event.set()
        logger.info("Filesystem-sync service stopped")

    async def wait_for_shutdown(self) -> None:
        """Wait for shutdown signal."""
        await self._shutdown_event.wait()

    async def _handle_file_event(
        self,
        event_type: str,
        path_info: PathInfo,
        old_path_info: PathInfo | None = None,
    ) -> None:
        """
        Handle a file system event.

        This is called from the watchdog thread via asyncio.run_coroutine_threadsafe.
        """
        if self._file_to_db_sync is None:
            return

        try:
            await self._file_to_db_sync.handle_file_event(
                event_type, path_info, old_path_info
            )
        except Exception as e:
            logger.error(
                "Error handling file event",
                event_type=event_type,
                path=str(path_info.full_path),
                error=str(e),
                exc_info=True,
            )

    async def _handle_db_event(self, event: DBEvent) -> None:
        """Handle a database change event."""
        if self._db_to_file_sync is None:
            return

        try:
            await self._db_to_file_sync.handle_db_event(event)
        except Exception as e:
            logger.error(
                "Error handling database event",
                table=event.table,
                action=event.action.value,
                entity_id=str(event.entity_id),
                error=str(e),
                exc_info=True,
            )


async def run_app(sync_mode: SyncMode | None = None) -> None:
    """
    Run the application with graceful shutdown handling.

    Args:
        sync_mode: Override sync mode from config
    """
    app = Application()

    # Setup signal handlers for graceful shutdown
    loop = asyncio.get_running_loop()
    shutdown_signals = (signal.SIGTERM, signal.SIGINT)

    for sig in shutdown_signals:
        loop.add_signal_handler(
            sig,
            lambda s=sig: asyncio.create_task(handle_shutdown(s, app)),
        )

    try:
        await app.start(sync_mode)
        await app.wait_for_shutdown()
    except Exception as e:
        logger.error("Application error", error=str(e), exc_info=True)
        raise
    finally:
        await app.stop()


async def handle_shutdown(sig: signal.Signals, app: Application) -> None:
    """Handle shutdown signal."""
    logger.info("Received shutdown signal", signal=sig.name)
    await app.stop()
