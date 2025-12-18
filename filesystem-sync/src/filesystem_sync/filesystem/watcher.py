"""
Filesystem watcher using watchdog.

Monitors the workspace directory for .xxp file changes and triggers
synchronization callbacks.
"""

from __future__ import annotations

import asyncio
import threading
from collections.abc import Awaitable, Callable
from pathlib import Path

import structlog
from watchdog.observers import Observer

from filesystem_sync.config import get_config
from filesystem_sync.security import PathInfo

from .handlers import FileSystemSyncHandler

logger = structlog.get_logger(__name__)


class FileSystemWatcher:
    """
    Manages the watchdog observer for monitoring workspace file changes.

    The watcher runs in a background thread and triggers async callbacks
    for file events via the provided event loop.
    """

    def __init__(
        self,
        workspace_path: Path | None = None,
        sync_callback: (
            Callable[[str, PathInfo, PathInfo | None], Awaitable[None]] | None
        ) = None,
        loop: asyncio.AbstractEventLoop | None = None,
    ):
        """
        Initialize the filesystem watcher.

        Args:
            workspace_path: Path to the workspace directory (default from config)
            sync_callback: Async callback for file events
            loop: Event loop for async callbacks (default: current running loop)
        """
        self._workspace = workspace_path or get_config().workspace_path
        self._workspace = self._workspace.resolve()
        self._sync_callback = sync_callback
        self._loop = loop

        self._observer: Observer | None = None  # pyright: ignore[reportInvalidTypeForm]
        self._is_running = False
        self._lock = threading.Lock()

    @property
    def workspace_path(self) -> Path:
        """Get the workspace path being watched."""
        return self._workspace

    @property
    def is_running(self) -> bool:
        """Check if the watcher is currently running."""
        with self._lock:
            return self._is_running

    def set_callback(
        self,
        callback: Callable[[str, PathInfo, PathInfo | None], Awaitable[None]],
        loop: asyncio.AbstractEventLoop | None = None,
    ) -> None:
        """
        Set the sync callback after initialization.

        Args:
            callback: Async callback for file events
            loop: Event loop for async callbacks
        """
        self._sync_callback = callback
        if loop is not None:
            self._loop = loop

    def start(self) -> None:
        """
        Start the filesystem watcher in a background thread.

        Raises:
            RuntimeError: If callback or loop is not set
            RuntimeError: If watcher is already running
        """
        with self._lock:
            if self._is_running:
                logger.warning("Filesystem watcher is already running")
                return

            if self._sync_callback is None:
                raise RuntimeError("Sync callback not set")

            if self._loop is None:
                try:
                    self._loop = asyncio.get_running_loop()
                except RuntimeError as err:
                    raise RuntimeError(
                        "Event loop not set and no running loop found"
                    ) from err

            try:
                # Ensure workspace exists
                if not self._workspace.exists():
                    logger.warning(
                        "Workspace path does not exist, creating it",
                        path=str(self._workspace),
                    )
                    self._workspace.mkdir(parents=True, exist_ok=True)

                # Create event handler
                handler = FileSystemSyncHandler(
                    sync_callback=self._sync_callback,
                    loop=self._loop,
                )

                # Create and start observer
                self._observer = Observer()
                self._observer.schedule(  # pyright: ignore[reportOptionalMemberAccess]
                    handler, str(self._workspace), recursive=True
                )
                self._observer.start()  # pyright: ignore[reportOptionalMemberAccess]
                self._is_running = True

                logger.info(
                    "Filesystem watcher started",
                    workspace=str(self._workspace),
                )

            except Exception as e:
                logger.error(
                    "Failed to start filesystem watcher",
                    error=str(e),
                    exc_info=True,
                )
                self._is_running = False
                raise

    def stop(self) -> None:
        """Stop the filesystem watcher."""
        with self._lock:
            if not self._is_running:
                logger.debug("Filesystem watcher is not running")
                return

            try:
                if self._observer is not None:
                    self._observer.stop()
                    self._observer.join(timeout=5)
                    self._observer = None

                self._is_running = False
                logger.info("Filesystem watcher stopped")

            except Exception as e:
                logger.error(
                    "Error stopping filesystem watcher",
                    error=str(e),
                    exc_info=True,
                )
                raise

    def get_status(self) -> dict:
        """
        Get the current status of the watcher.

        Returns:
            Status dictionary with running state and workspace path
        """
        with self._lock:
            return {
                "running": self._is_running,
                "workspace_path": str(self._workspace),
                "observer_alive": (
                    self._observer.is_alive() if self._observer is not None else False
                ),
            }

    async def wait_for_stop(self) -> None:
        """Wait for the watcher to stop (for graceful shutdown)."""
        while self.is_running:
            await asyncio.sleep(0.1)
