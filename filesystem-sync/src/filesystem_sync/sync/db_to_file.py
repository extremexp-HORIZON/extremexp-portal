"""
Database to File synchronization logic.

Handles syncing database changes to the filesystem.
"""

from __future__ import annotations

from typing import Literal
from uuid import UUID

import structlog

from filesystem_sync.conversion import ConversionClient, get_conversion_client
from filesystem_sync.conversion.payloads import build_experiment_dms_payload
from filesystem_sync.db import DBEvent, DBEventType, Repository, get_async_session
from filesystem_sync.filesystem import FileOperations, get_file_operations

from .event_registry import EventRegistry, get_event_registry

logger = structlog.get_logger(__name__)


class DatabaseToFileSync:
    """
    Handles synchronization from database to filesystem.

    When a database record is created, updated, or deleted via the API,
    this class updates the corresponding .xxp file.
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

    async def handle_db_event(self, event: DBEvent) -> None:
        """
        Handle a database event and sync to filesystem.

        Args:
            event: Database event from LISTEN/NOTIFY
        """
        table = event.table

        # Map table to file_type
        if table == "experiment":
            file_type: Literal["experiments", "workflows"] = "experiments"
        elif table == "workflow":
            file_type = "workflows"
        else:
            logger.debug("Ignoring event for non-synced table", table=table)
            return

        if event.action == DBEventType.INSERT:
            await self._handle_insert(file_type, event.entity_id, event.user_id)
        elif event.action == DBEventType.UPDATE:
            await self._handle_update(file_type, event.entity_id, event.user_id)
        elif event.action == DBEventType.DELETE:
            await self._handle_delete(
                file_type, event.entity_id, event.user_id, event.name
            )

    async def _get_entity_and_user(
        self,
        file_type: Literal["experiments", "workflows"],
        entity_id: UUID,
        user_id: UUID,
    ) -> tuple[str | None, str | None, dict | None, str | None]:
        """
        Fetch entity data and username from database.

        Returns:
            Tuple of (username, entity_name, json_data, error_message).
        """
        async with get_async_session() as session:
            # Get user
            user = await Repository.get_user_by_id(session, user_id)
            if user is None:
                logger.warning("User not found for DB event", user_id=str(user_id))
                return None, None, None, None

            # Get entity
            if file_type == "experiments":
                entity = await Repository.get_experiment_by_id(session, entity_id)
                if entity is None:
                    return user.username, None, None, None

                workflows = await Repository.list_workflows_for_user(session, user.id)
                try:
                    json_data = build_experiment_dms_payload(
                        name=entity.name,
                        steps=entity.steps,
                        workflows=workflows,
                    )
                except ValueError as e:
                    return user.username, entity.name, None, str(e)

                return user.username, entity.name, json_data, None
            else:
                entity = await Repository.get_workflow_by_id(session, entity_id)
                if entity is None:
                    return user.username, None, None, None
                # For workflows, graphical_model is the content
                return user.username, entity.name, entity.graphical_model, None

    async def _handle_insert(
        self,
        file_type: Literal["experiments", "workflows"],
        entity_id: UUID,
        user_id: UUID,
    ) -> None:
        """Handle database INSERT - create file."""
        logger.info(
            "Processing DB insert",
            file_type=file_type,
            entity_id=str(entity_id),
        )

        username, name, json_data, payload_error = await self._get_entity_and_user(
            file_type, entity_id, user_id
        )

        if payload_error is not None and username is not None and name is not None:
            self._file_ops.write_error(username, file_type, name, payload_error)
            logger.error(
                "Failed to build DMS payload for DB insert",
                username=username,
                file_type=file_type,
                name=name,
                error=payload_error,
            )
            return

        if username is None or name is None or json_data is None:
            logger.warning(
                "Could not find entity for DB insert",
                entity_id=str(entity_id),
            )
            return

        # Check if this event should be ignored (file-initiated)
        if self._registry.should_ignore("create", username, file_type, name):
            logger.debug(
                "Ignoring DB insert (file-initiated)",
                username=username,
                file_type=file_type,
                name=name,
            )
            return

        # Convert JSON to DSL with error handling
        try:
            result = await self._conversion.json_to_dsl(
                file_type, name, json_data or {}
            )
        except Exception as e:
            logger.error(
                "Unexpected error during conversion for DB insert",
                username=username,
                file_type=file_type,
                name=name,
                error=str(e),
                exc_info=True,
            )
            # Write error file
            self._file_ops.write_error(
                username,
                file_type,
                name,
                f"Conversion crashed: {e}",
            )
            return

        if not result.success:
            logger.error(
                "Conversion failed for DB insert",
                username=username,
                file_type=file_type,
                name=name,
                error=str(result.error),
            )
            # Write error file with conversion error details
            if result.error:
                self._file_ops.write_error(
                    username,
                    file_type,
                    name,
                    result.error.to_error_file_content(),
                )
            return

        dsl_content = result.data if isinstance(result.data, str) else ""

        # Register event to prevent loop
        self._registry.register("create", username, file_type, name)

        # Write file
        success = self._file_ops.write(username, file_type, name, dsl_content)
        if success:
            # Clear any previous error file on success
            self._file_ops.delete_error(username, file_type, name)
            logger.info(
                "Successfully synced DB insert to file",
                username=username,
                file_type=file_type,
                name=name,
            )
        else:
            logger.error(
                "Failed to write file for DB insert",
                username=username,
                file_type=file_type,
                name=name,
            )

    async def _handle_update(
        self,
        file_type: Literal["experiments", "workflows"],
        entity_id: UUID,
        user_id: UUID,
    ) -> None:
        """Handle database UPDATE - update file."""
        logger.info(
            "Processing DB update",
            file_type=file_type,
            entity_id=str(entity_id),
        )

        username, name, json_data, payload_error = await self._get_entity_and_user(
            file_type, entity_id, user_id
        )

        if payload_error is not None and username is not None and name is not None:
            self._file_ops.write_error(username, file_type, name, payload_error)
            logger.error(
                "Failed to build DMS payload for DB update",
                username=username,
                file_type=file_type,
                name=name,
                error=payload_error,
            )
            return

        if username is None or name is None or json_data is None:
            logger.warning(
                "Could not find entity for DB update",
                entity_id=str(entity_id),
            )
            return

        # Check if this event should be ignored (file-initiated)
        if self._registry.should_ignore("modify", username, file_type, name):
            logger.debug(
                "Ignoring DB update (file-initiated)",
                username=username,
                file_type=file_type,
                name=name,
            )
            return

        # Convert JSON to DSL with error handling
        try:
            result = await self._conversion.json_to_dsl(
                file_type, name, json_data or {}
            )
        except Exception as e:
            logger.error(
                "Unexpected error during conversion for DB update",
                username=username,
                file_type=file_type,
                name=name,
                error=str(e),
                exc_info=True,
            )
            # Write error file
            self._file_ops.write_error(
                username,
                file_type,
                name,
                f"Conversion crashed: {e}",
            )
            return

        if not result.success:
            logger.error(
                "Conversion failed for DB update",
                username=username,
                file_type=file_type,
                name=name,
                error=str(result.error),
            )
            # Write error file with conversion error details
            if result.error:
                self._file_ops.write_error(
                    username,
                    file_type,
                    name,
                    result.error.to_error_file_content(),
                )
            return

        dsl_content = result.data if isinstance(result.data, str) else ""

        # Register event to prevent loop
        self._registry.register("modify", username, file_type, name)

        # Write file
        success = self._file_ops.write(username, file_type, name, dsl_content)
        if success:
            # Clear any previous error file on success
            self._file_ops.delete_error(username, file_type, name)
            logger.info(
                "Successfully synced DB update to file",
                username=username,
                file_type=file_type,
                name=name,
            )
        else:
            logger.error(
                "Failed to write file for DB update",
                username=username,
                file_type=file_type,
                name=name,
            )

    async def _handle_delete(
        self,
        file_type: Literal["experiments", "workflows"],
        entity_id: UUID,
        user_id: UUID,
        name: str | None = None,
    ) -> None:
        """Handle database DELETE - delete file."""
        logger.info(
            "Processing DB delete",
            file_type=file_type,
            entity_id=str(entity_id),
            name=name,
        )

        # Get username
        async with get_async_session() as session:
            user = await Repository.get_user_by_id(session, user_id)
            if user is None:
                logger.warning(
                    "User not found for DB delete",
                    user_id=str(user_id),
                )
                return
            username = user.username

        # If we have the name from the NOTIFY payload, we can delete the file
        if name is not None:
            # Check if this event should be ignored (file-initiated)
            if self._registry.should_ignore("delete", username, file_type, name):
                logger.debug(
                    "Ignoring DB delete (file-initiated)",
                    username=username,
                    file_type=file_type,
                    name=name,
                )
                return

            # Register event to prevent loop
            self._registry.register("delete", username, file_type, name)

            # Delete the file
            success = self._file_ops.delete(username, file_type, name)
            if success:
                logger.info(
                    "Successfully deleted file for DB delete",
                    username=username,
                    file_type=file_type,
                    name=name,
                )
            else:
                logger.warning(
                    "File not found or could not be deleted for DB delete",
                    username=username,
                    file_type=file_type,
                    name=name,
                )
        else:
            # Legacy behavior: name not available in NOTIFY payload
            # This can happen with older trigger versions
            logger.warning(
                "DB delete received but entity name not in NOTIFY payload. "
                "File may need manual cleanup if API did not delete it.",
                user_id=str(user_id),
                entity_id=str(entity_id),
                file_type=file_type,
            )

    async def sync_entity_to_file(
        self,
        file_type: Literal["experiments", "workflows"],
        username: str,
        name: str,
        json_data: dict,
    ) -> bool:
        """
        Manually sync an entity to a file.

        Useful for initial sync.

        Args:
            file_type: experiments or workflows
            username: Username who owns the file
            name: Entity name
            json_data: JSON data to convert to DSL

        Returns:
            True if successful
        """
        try:
            result = await self._conversion.json_to_dsl(file_type, name, json_data)
            if not result.success:
                logger.error(
                    "Conversion failed for sync",
                    username=username,
                    file_type=file_type,
                    name=name,
                )
                # Write error file with conversion error details
                if result.error:
                    self._file_ops.write_error(
                        username,
                        file_type,
                        name,
                        result.error.to_error_file_content(),
                    )
                return False

            dsl_content = result.data if isinstance(result.data, str) else ""
            success = self._file_ops.write(username, file_type, name, dsl_content)
            if success:
                # Clear any previous error file on success
                self._file_ops.delete_error(username, file_type, name)
            return success
        except Exception as e:
            logger.error(
                "Failed to sync entity to file",
                username=username,
                file_type=file_type,
                name=name,
                error=str(e),
                exc_info=True,
            )
            # Write error file for unexpected errors
            self._file_ops.write_error(
                username,
                file_type,
                name,
                f"Sync failed: {e}",
            )
            return False
