"""
Initial synchronization on startup.

Reconciles the filesystem and database state when the service starts.
Filesystem is always the source of truth.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

import structlog

from filesystem_sync.conversion import ConversionClient, get_conversion_client
from filesystem_sync.db import Repository, get_async_session
from filesystem_sync.filesystem import FileOperations, get_file_operations

from .event_registry import EventRegistry, get_event_registry

logger = structlog.get_logger(__name__)


class SyncMode(str, Enum):
    """Initial sync mode."""

    WARN = "warn"  # Only log discrepancies
    SYNC = "sync"  # Sync filesystem to DB (add missing, update existing)
    FULL = "full"  # Full reconciliation (also delete DB records without files)


class InitialSync:
    """
    Performs initial synchronization between filesystem and database.

    The filesystem is always the source of truth.
    """

    def __init__(
        self,
        file_ops: FileOperations | None = None,
        conversion_client: ConversionClient | None = None,
        event_registry: EventRegistry | None = None,
    ):
        """
        Initialize the initial sync handler.

        Args:
            file_ops: File operations instance
            conversion_client: DSL conversion client
            event_registry: Event registry for loop prevention
        """
        self._file_ops = file_ops or get_file_operations()
        self._conversion = conversion_client or get_conversion_client()
        self._registry = event_registry or get_event_registry()

    async def run(self, mode: SyncMode = SyncMode.WARN) -> dict:
        """
        Run initial synchronization.

        Args:
            mode: Sync mode (warn, sync, or full)

        Returns:
            Dictionary with sync statistics
        """
        logger.info("Starting initial sync", mode=mode.value)

        stats = {
            "users_scanned": 0,
            "files_found": 0,
            "db_records_found": 0,
            "files_without_db": 0,
            "db_without_files": 0,
            "synced_to_db": 0,
            "deleted_from_db": 0,
            "errors": 0,
        }

        # Get all users from filesystem
        usernames = self._file_ops.list_users()
        stats["users_scanned"] = len(usernames)

        logger.info("Found users in workspace", count=len(usernames))

        for username in usernames:
            await self._sync_user(username, mode, stats)

        # In FULL mode, also check for orphaned DB records
        if mode == SyncMode.FULL:
            await self._cleanup_orphaned_records(usernames, stats)

        logger.info(
            "Initial sync completed",
            mode=mode.value,
            stats=stats,
        )

        return stats

    async def _sync_user(
        self,
        username: str,
        mode: SyncMode,
        stats: dict,
    ) -> None:
        """Sync a single user's files and database records."""
        logger.debug("Syncing user", username=username)

        for file_type in ("experiments", "workflows"):
            await self._sync_file_type(username, file_type, mode, stats)

    async def _sync_file_type(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        mode: SyncMode,
        stats: dict,
    ) -> None:
        """Sync a single file type (experiments or workflows) for a user."""
        # Get files from filesystem
        file_names = set(self._file_ops.list_files(username, file_type))
        stats["files_found"] += len(file_names)

        # Get records from database
        async with get_async_session() as session:
            user = await Repository.get_user_by_username(session, username)

            if user is None:
                # User doesn't exist in DB
                if file_names and mode in (SyncMode.SYNC, SyncMode.FULL):
                    # Create user and sync files
                    user = await Repository.get_or_create_user(session, username)
                elif file_names:
                    logger.warning(
                        "Files exist but user not in DB",
                        username=username,
                        file_type=file_type,
                        count=len(file_names),
                    )
                    stats["files_without_db"] += len(file_names)
                return

            # Get existing DB records
            if file_type == "experiments":
                db_entities = await Repository.list_experiments_for_user(
                    session, user.id
                )
            else:
                db_entities = await Repository.list_workflows_for_user(session, user.id)

            db_names = {entity.name for entity in db_entities}
            stats["db_records_found"] += len(db_names)

            # Find discrepancies
            files_not_in_db = file_names - db_names
            db_not_in_files = db_names - file_names

            if files_not_in_db:
                stats["files_without_db"] += len(files_not_in_db)

                for name in files_not_in_db:
                    if mode in (SyncMode.SYNC, SyncMode.FULL):
                        # Sync file to DB
                        success = await self._sync_file_to_db(
                            session, user.id, username, file_type, name
                        )
                        if success:
                            stats["synced_to_db"] += 1
                        else:
                            stats["errors"] += 1
                    else:
                        logger.warning(
                            "File exists but not in DB",
                            username=username,
                            file_type=file_type,
                            name=name,
                        )

            if db_not_in_files:
                stats["db_without_files"] += len(db_not_in_files)

                for name in db_not_in_files:
                    if mode == SyncMode.FULL:
                        # Delete orphaned DB record
                        logger.warning(
                            "Deleting orphaned DB record",
                            username=username,
                            file_type=file_type,
                            name=name,
                        )
                        if file_type == "experiments":
                            await Repository.delete_experiment_by_name(
                                session, user.id, name
                            )
                        else:
                            await Repository.delete_workflow_by_name(
                                session, user.id, name
                            )
                        stats["deleted_from_db"] += 1
                    else:
                        logger.warning(
                            "DB record exists but no file",
                            username=username,
                            file_type=file_type,
                            name=name,
                        )

    async def _sync_file_to_db(
        self,
        session,
        user_id,
        username: str,
        file_type: Literal["experiments", "workflows"],
        name: str,
    ) -> bool:
        """Sync a single file to the database."""
        logger.info(
            "Syncing file to DB",
            username=username,
            file_type=file_type,
            name=name,
        )

        # Read file content
        content = self._file_ops.read(username, file_type, name)
        if content is None:
            logger.error(
                "Could not read file for sync",
                username=username,
                file_type=file_type,
                name=name,
            )
            return False

        # Convert DSL to JSON with error handling
        if content.strip():
            try:
                result = await self._conversion.dsl_to_json(file_type, name, content)
            except Exception as e:
                logger.error(
                    "Conversion crashed during initial sync",
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
                    f"Conversion crashed: {e}",
                )
                return False

            if not result.success:
                logger.error(
                    "Conversion failed during initial sync",
                    username=username,
                    file_type=file_type,
                    name=name,
                )
                # Write error file
                if result.error:
                    self._file_ops.write_error(
                        username,
                        file_type,
                        name,
                        result.error.to_error_file_content(),
                    )
                return False
            json_data = result.data
        else:
            json_data = {} if file_type == "workflows" else []

        # Clear any previous error file on successful conversion
        self._file_ops.delete_error(username, file_type, name)

        # Upsert to database
        try:
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
                    user_id,
                    name,
                    steps=steps,
                    graphical_model=graphical_model,
                )
            else:
                await Repository.upsert_workflow(
                    session,
                    user_id,
                    name,
                    graphical_model=json_data if isinstance(json_data, dict) else None,
                )
            return True
        except Exception as e:
            logger.error(
                "Failed to upsert during initial sync",
                username=username,
                file_type=file_type,
                name=name,
                error=str(e),
            )
            return False

    async def _cleanup_orphaned_records(
        self,
        fs_usernames: list[str],
        stats: dict,
    ) -> None:
        """
        Clean up DB records for users that don't exist in filesystem.

        Only called in FULL mode.
        """
        async with get_async_session() as session:
            db_users = await Repository.list_users(session)
            fs_usernames_set = set(fs_usernames)

            for user in db_users:
                if user.username not in fs_usernames_set:
                    # User in DB but not in filesystem
                    # Check if they have any experiments or workflows
                    experiments = await Repository.list_experiments_for_user(
                        session, user.id
                    )
                    workflows = await Repository.list_workflows_for_user(
                        session, user.id
                    )

                    if experiments or workflows:
                        logger.warning(
                            "User in DB has records but no filesystem directory",
                            username=user.username,
                            experiments=len(experiments),
                            workflows=len(workflows),
                        )
                        # Delete their records
                        for exp in experiments:
                            await Repository.delete_experiment(session, exp)
                            stats["deleted_from_db"] += 1
                        for wf in workflows:
                            await Repository.delete_workflow(session, wf)
                            stats["deleted_from_db"] += 1
