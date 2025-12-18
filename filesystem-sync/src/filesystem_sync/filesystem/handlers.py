"""
File system event handlers for watchdog.

Handles file create, modify, delete, and move events for .xxp files,
triggering database synchronization.
"""

from __future__ import annotations

import asyncio
import concurrent.futures
from collections.abc import Awaitable, Callable
from pathlib import Path
from typing import TYPE_CHECKING

import structlog
from watchdog.events import FileSystemEvent, FileSystemEventHandler

from filesystem_sync.config import get_config
from filesystem_sync.security import PathInfo, is_error_file, parse_xxp_path

if TYPE_CHECKING:
    pass

logger = structlog.get_logger(__name__)


class FileSystemSyncHandler(FileSystemEventHandler):
    """
    Watchdog event handler that triggers database sync for .xxp file changes.

    This handler runs in a separate thread (watchdog's observer thread),
    so it uses asyncio.run_coroutine_threadsafe to call async sync methods.
    """

    def __init__(
        self,
        sync_callback: Callable[[str, PathInfo, PathInfo | None], Awaitable[None]],
        loop: asyncio.AbstractEventLoop,
    ):
        """
        Initialize the handler.

        Args:
            sync_callback: Async callback for file events.
                           Signature: (event_type, path_info, old_path_info) -> None
                           For move events, old_path_info is the source path.
            loop: The asyncio event loop to run callbacks on
        """
        super().__init__()
        self._sync_callback = sync_callback
        self._loop = loop
        self._workspace = get_config().workspace_path.resolve()

    def _parse_path(self, path_str: str) -> PathInfo | None:
        """Parse and validate a file path."""
        path = Path(path_str)

        # Skip error files
        if is_error_file(path):
            return None

        # Only process .xxp files
        if not path.name.endswith(".xxp"):
            return None

        return parse_xxp_path(path, self._workspace)

    def _run_async(
        self,
        event_type: str,
        path_info: PathInfo,
        old_path_info: PathInfo | None = None,
    ) -> None:
        """Run the async callback from the watchdog thread."""
        try:
            coro = self._sync_callback(event_type, path_info, old_path_info)
            future = asyncio.run_coroutine_threadsafe(
                coro,  # pyright: ignore[reportArgumentType]
                self._loop,
            )
            # Don't wait for the result - fire and forget
            # But log any exceptions
            future.add_done_callback(
                self._handle_callback_result  # pyright: ignore[reportArgumentType]
            )
        except Exception as e:
            logger.error(
                "Failed to schedule async callback",
                event_type=event_type,
                error=str(e),
            )

    def _handle_callback_result(self, future: concurrent.futures.Future[None]) -> None:
        """Handle the result of an async callback."""
        try:
            future.result()
        except Exception as e:
            logger.error("Async callback failed", error=str(e), exc_info=True)

    def on_created(self, event: FileSystemEvent) -> None:
        """Handle file creation events."""
        if event.is_directory:
            return

        path_info = self._parse_path(str(event.src_path))
        if path_info is None:
            return

        logger.info(
            "File created",
            path=event.src_path,
            username=path_info.username,
            file_type=path_info.file_type,
            file_name=path_info.file_name,
        )

        self._run_async("create", path_info)

    def on_modified(self, event: FileSystemEvent) -> None:
        """Handle file modification events."""
        if event.is_directory:
            return

        path_info = self._parse_path(str(event.src_path))
        if path_info is None:
            return

        logger.info(
            "File modified",
            path=event.src_path,
            username=path_info.username,
            file_type=path_info.file_type,
            file_name=path_info.file_name,
        )

        self._run_async("modify", path_info)

    def on_deleted(self, event: FileSystemEvent) -> None:
        """Handle file deletion events."""
        if event.is_directory:
            return

        path_info = self._parse_path(str(event.src_path))
        if path_info is None:
            return

        logger.info(
            "File deleted",
            path=event.src_path,
            username=path_info.username,
            file_type=path_info.file_type,
            file_name=path_info.file_name,
        )

        self._run_async("delete", path_info)

    def on_moved(self, event: FileSystemEvent) -> None:
        """Handle file move/rename events."""
        if event.is_directory:
            return

        # For move events, we need both source and destination
        old_path_info = self._parse_path(str(event.src_path))
        new_path_info = self._parse_path(str(getattr(event, "dest_path", "")))

        # If new path is not a valid .xxp file, treat as delete
        if new_path_info is None and old_path_info is not None:
            logger.info(
                "File moved out of workspace (treating as delete)",
                src_path=event.src_path,
            )
            self._run_async("delete", old_path_info)
            return

        # If old path was not valid but new one is, treat as create
        if old_path_info is None and new_path_info is not None:
            logger.info(
                "File moved into workspace (treating as create)",
                dest_path=event.dest_path,
            )
            self._run_async("create", new_path_info)
            return

        # Both paths valid - this is a rename within workspace
        if old_path_info is not None and new_path_info is not None:
            logger.info(
                "File moved/renamed",
                src_path=event.src_path,
                dest_path=event.dest_path,
                old_name=old_path_info.file_name,
                new_name=new_path_info.file_name,
            )
            self._run_async("rename", new_path_info, old_path_info)
