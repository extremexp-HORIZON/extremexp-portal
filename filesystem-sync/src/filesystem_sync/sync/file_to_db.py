"""
File to Database synchronization logic.

Handles syncing file changes to the PostgreSQL database.
"""

from __future__ import annotations

from typing import Any, Literal

import structlog

from filesystem_sync.conversion import ConversionClient, get_conversion_client
from filesystem_sync.db import Repository, get_async_session
from filesystem_sync.filesystem import FileOperations, get_file_operations
from filesystem_sync.security import PathInfo

from .event_registry import EventRegistry, get_event_registry

logger = structlog.get_logger(__name__)


class FileToDatabaseSync:
    """
    Handles synchronization from filesystem to database.

    When a .xxp file is created, modified, deleted, or renamed,
    this class updates the corresponding database record.
    """

    def __init__(
        self,
        file_ops: FileOperations | None = None,
        conversion_client: ConversionClient | None = None,
        event_registry: EventRegistry | None = None,
    ):
        """
        Initialize the sync handler.

        Args:
            file_ops: File operations instance
            conversion_client: DSL conversion client
            event_registry: Event registry for loop prevention
        """
        self._file_ops = file_ops or get_file_operations()
        self._conversion = conversion_client or get_conversion_client()
        self._registry = event_registry or get_event_registry()

    async def handle_file_event(
        self,
        event_type: str,
        path_info: PathInfo,
        old_path_info: PathInfo | None = None,
    ) -> None:
        """
        Handle a file event and sync to database.

        Args:
            event_type: Type of event (create, modify, delete, rename)
            path_info: Parsed path information
            old_path_info: For rename events, the old path info
        """
        username = path_info.username
        file_type = path_info.file_type
        file_name = path_info.file_name

        # Check if this event should be ignored (API-initiated)
        if self._registry.should_ignore(
            event_type,  # pyright: ignore[reportArgumentType]
            username,
            file_type,
            file_name,
        ):
            logger.debug(
                "Ignoring file event (registered)",
                event_type=event_type,
                username=username,
                file_type=file_type,
                file_name=file_name,
            )
            return

        if event_type == "create":
            await self._handle_create(username, file_type, file_name)
        elif event_type == "modify":
            await self._handle_modify(username, file_type, file_name)
        elif event_type == "delete":
            await self._handle_delete(username, file_type, file_name)
        elif event_type == "rename" and old_path_info is not None:
            await self._handle_rename(
                old_path_info.username,
                old_path_info.file_type,
                old_path_info.file_name,
                username,
                file_type,
                file_name,
            )
        else:
            logger.warning(
                "Unknown event type",
                event_type=event_type,
                path=str(path_info.full_path),
            )

    async def _handle_create(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> None:
        """Handle file creation - create/update database record."""
        logger.info(
            "Processing file creation",
            username=username,
            file_type=file_type,
            file_name=file_name,
        )

        # Read file content
        content = self._file_ops.read(username, file_type, file_name)
        if content is None:
            logger.warning(
                "Could not read file for creation",
                username=username,
                file_type=file_type,
                file_name=file_name,
            )
            return

        # Convert DSL to JSON (skip if empty content - new file)
        if content.strip():
            result = await self._conversion.dsl_to_json(file_type, file_name, content)
            if not result.success:
                # Write error file
                if result.error:
                    self._file_ops.write_error(
                        username,
                        file_type,
                        file_name,
                        result.error.to_error_file_content(),
                    )
                logger.error(
                    "Conversion failed for file creation",
                    username=username,
                    file_type=file_type,
                    file_name=file_name,
                )
                return
            json_data = result.data
        else:
            # Empty file - use empty data
            json_data = {} if file_type == "workflows" else []

        # Delete any existing error file on success
        self._file_ops.delete_error(username, file_type, file_name)

        # Register event to prevent loop
        self._registry.register("create", username, file_type, file_name)

        # Upsert to database
        async with get_async_session() as session:
            user = await Repository.get_or_create_user(session, username)

            if file_type == "experiments":
                steps: list[dict[str, Any]] = []
                graphical_model: dict[str, Any] | None = None
                if isinstance(json_data, list):
                    steps = json_data
                elif isinstance(json_data, dict):
                    steps = json_data.get("steps", [])
                    graphical_model = json_data.get("graphical_model")
                await Repository.upsert_experiment(
                    session,
                    user.id,
                    file_name,
                    steps=steps,
                    graphical_model=graphical_model,
                )
            else:
                await Repository.upsert_workflow(
                    session,
                    user.id,
                    file_name,
                    graphical_model=json_data if isinstance(json_data, dict) else None,
                )

        logger.info(
            "Successfully synced file creation to database",
            username=username,
            file_type=file_type,
            file_name=file_name,
        )

    async def _handle_modify(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> None:
        """Handle file modification - update database record."""
        logger.info(
            "Processing file modification",
            username=username,
            file_type=file_type,
            file_name=file_name,
        )

        # Read file content
        content = self._file_ops.read(username, file_type, file_name)
        if content is None:
            logger.warning(
                "Could not read file for modification",
                username=username,
                file_type=file_type,
                file_name=file_name,
            )
            return

        # Convert DSL to JSON
        if content.strip():
            result = await self._conversion.dsl_to_json(file_type, file_name, content)
            if not result.success:
                # Write error file
                if result.error:
                    self._file_ops.write_error(
                        username,
                        file_type,
                        file_name,
                        result.error.to_error_file_content(),
                    )
                logger.error(
                    "Conversion failed for file modification",
                    username=username,
                    file_type=file_type,
                    file_name=file_name,
                )
                return
            json_data = result.data
        else:
            json_data = {} if file_type == "workflows" else []

        # Delete any existing error file on success
        self._file_ops.delete_error(username, file_type, file_name)

        # Register event to prevent loop
        self._registry.register("modify", username, file_type, file_name)

        # Update in database
        async with get_async_session() as session:
            user = await Repository.get_or_create_user(session, username)

            if file_type == "experiments":
                steps: list[dict[str, Any]] = []
                graphical_model: dict[str, Any] | None = None
                if isinstance(json_data, list):
                    steps = json_data
                elif isinstance(json_data, dict):
                    steps = json_data.get("steps", [])
                    graphical_model = json_data.get("graphical_model")
                await Repository.upsert_experiment(
                    session,
                    user.id,
                    file_name,
                    steps=steps,
                    graphical_model=graphical_model,
                )
            else:
                await Repository.upsert_workflow(
                    session,
                    user.id,
                    file_name,
                    graphical_model=json_data if isinstance(json_data, dict) else None,
                )

        logger.info(
            "Successfully synced file modification to database",
            username=username,
            file_type=file_type,
            file_name=file_name,
        )

    async def _handle_delete(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> None:
        """Handle file deletion - delete database record."""
        logger.info(
            "Processing file deletion",
            username=username,
            file_type=file_type,
            file_name=file_name,
        )

        # Register event to prevent loop
        self._registry.register("delete", username, file_type, file_name)

        # Delete from database
        async with get_async_session() as session:
            user = await Repository.get_user_by_username(session, username)
            if user is None:
                logger.warning(
                    "User not found for file deletion",
                    username=username,
                )
                return

            if file_type == "experiments":
                deleted = await Repository.delete_experiment_by_name(
                    session, user.id, file_name
                )
            else:
                deleted = await Repository.delete_workflow_by_name(
                    session, user.id, file_name
                )

            if deleted:
                logger.info(
                    "Successfully deleted record from database",
                    username=username,
                    file_type=file_type,
                    file_name=file_name,
                )
            else:
                logger.warning(
                    "Record not found in database for deletion",
                    username=username,
                    file_type=file_type,
                    file_name=file_name,
                )

    async def _handle_rename(
        self,
        old_username: str,
        old_file_type: Literal["experiments", "workflows"],
        old_file_name: str,
        new_username: str,
        new_file_type: Literal["experiments", "workflows"],
        new_file_name: str,
    ) -> None:
        """Handle file rename - update database record name."""
        logger.info(
            "Processing file rename",
            old_username=old_username,
            old_file_type=old_file_type,
            old_file_name=old_file_name,
            new_username=new_username,
            new_file_type=new_file_type,
            new_file_name=new_file_name,
        )

        # Handle cross-user or cross-type moves as delete + create
        if old_username != new_username or old_file_type != new_file_type:
            logger.info("File moved across users/types - handling as delete + create")
            await self._handle_delete(old_username, old_file_type, old_file_name)
            await self._handle_create(new_username, new_file_type, new_file_name)
            return

        # Same user and type - simple rename
        # Register event to prevent loop
        self._registry.register("rename", new_username, new_file_type, new_file_name)

        async with get_async_session() as session:
            user = await Repository.get_user_by_username(session, new_username)
            if user is None:
                logger.warning(
                    "User not found for file rename",
                    username=new_username,
                )
                return

            if new_file_type == "experiments":
                experiment = await Repository.get_experiment_by_name(
                    session, user.id, old_file_name
                )
                if experiment is None:
                    # Experiment doesn't exist - treat as create
                    logger.info(
                        "Old experiment not found, creating new one",
                        old_name=old_file_name,
                        new_name=new_file_name,
                    )
                    await self._handle_create(
                        new_username, new_file_type, new_file_name
                    )
                    return
                await Repository.update_experiment(
                    session, experiment, name=new_file_name
                )
            else:
                workflow = await Repository.get_workflow_by_name(
                    session, user.id, old_file_name
                )
                if workflow is None:
                    # Workflow doesn't exist - treat as create
                    logger.info(
                        "Old workflow not found, creating new one",
                        old_name=old_file_name,
                        new_name=new_file_name,
                    )
                    await self._handle_create(
                        new_username, new_file_type, new_file_name
                    )
                    return
                await Repository.update_workflow(session, workflow, name=new_file_name)

        logger.info(
            "Successfully renamed record in database",
            old_name=old_file_name,
            new_name=new_file_name,
        )

    async def sync_file_to_db(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> bool:
        """
        Manually sync a single file to the database.

        Useful for initial sync.

        Args:
            username: Username who owns the file
            file_type: experiments or workflows
            file_name: File name without extension

        Returns:
            True if successful
        """
        try:
            await self._handle_modify(username, file_type, file_name)
            return True
        except Exception as e:
            logger.error(
                "Failed to sync file to database",
                username=username,
                file_type=file_type,
                file_name=file_name,
                error=str(e),
            )
            return False
