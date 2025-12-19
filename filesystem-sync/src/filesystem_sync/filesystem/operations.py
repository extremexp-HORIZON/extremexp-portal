"""
Safe filesystem operations with path validation.

All file operations go through this module to ensure security.
"""

from __future__ import annotations

from pathlib import Path
from typing import Literal

import structlog

from filesystem_sync.config import get_config
from filesystem_sync.security import (
    PathInfo,
    get_error_file_path,
    is_error_file,
    parse_xxp_path,
    safe_path,
)

logger = structlog.get_logger(__name__)


class FileOperations:
    """
    Safe filesystem operations for .xxp files.

    All paths are validated to prevent directory traversal attacks.
    """

    def __init__(self, workspace_path: Path | None = None):
        """
        Initialize file operations.

        Args:
            workspace_path: Workspace root directory (default from config)
        """
        self._workspace = workspace_path or get_config().workspace_path
        self._workspace = self._workspace.resolve()

    @property
    def workspace_path(self) -> Path:
        """Get the workspace root path."""
        return self._workspace

    def _get_safe_path(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> Path | None:
        """
        Get a validated safe path for a file.

        Args:
            username: Username who owns the file
            file_type: "experiments" or "workflows"
            file_name: Name without .xxp extension

        Returns:
            Safe path or None if validation fails
        """
        # Construct filename with extension
        filename = f"{file_name}.xxp"
        return safe_path(self._workspace, username, file_type, filename)

    def get_file_path(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> Path | None:
        """
        Get the path for a .xxp file, validating all components.

        Args:
            username: Username who owns the file
            file_type: "experiments" or "workflows"
            file_name: Name without .xxp extension

        Returns:
            Path to the file, or None if path validation fails
        """
        return self._get_safe_path(username, file_type, file_name)

    def parse_path(self, file_path: Path) -> PathInfo | None:
        """
        Parse and validate a file path.

        Args:
            file_path: Path to parse

        Returns:
            PathInfo or None if invalid
        """
        return parse_xxp_path(file_path, self._workspace)

    def exists(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> bool:
        """Check if a file exists."""
        path = self._get_safe_path(username, file_type, file_name)
        if path is None:
            return False
        return path.exists()

    def read(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> str | None:
        """
        Read content from a .xxp file.

        Args:
            username: Username who owns the file
            file_type: "experiments" or "workflows"
            file_name: Name without .xxp extension

        Returns:
            File content as string, or None if file doesn't exist or path is invalid
        """
        path = self._get_safe_path(username, file_type, file_name)
        if path is None:
            logger.warning(
                "Invalid path for read",
                username=username,
                file_type=file_type,
                file_name=file_name,
            )
            return None

        if not path.exists():
            return None

        try:
            content = path.read_text(encoding="utf-8")
            logger.debug("Read file", path=str(path), size=len(content))
            return content
        except Exception as e:
            logger.error("Failed to read file", path=str(path), error=str(e))
            return None

    def read_path(self, file_path: Path) -> str | None:
        """
        Read content from a path (must be within workspace).

        Args:
            file_path: Path to the file

        Returns:
            File content or None if invalid/not found
        """
        # Validate path is within workspace
        info = self.parse_path(file_path)
        if info is None:
            logger.warning("Invalid path for read", path=str(file_path))
            return None

        return self.read(info.username, info.file_type, info.file_name)

    def write(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
        content: str,
    ) -> bool:
        """
        Write content to a .xxp file.

        Creates parent directories if they don't exist.

        Args:
            username: Username who owns the file
            file_type: "experiments" or "workflows"
            file_name: Name without .xxp extension
            content: Content to write

        Returns:
            True if successful, False otherwise
        """
        path = self._get_safe_path(username, file_type, file_name)
        if path is None:
            logger.warning(
                "Invalid path for write",
                username=username,
                file_type=file_type,
                file_name=file_name,
            )
            return False

        try:
            # Ensure parent directory exists
            path.parent.mkdir(parents=True, exist_ok=True)

            # Write content
            path.write_text(content, encoding="utf-8")
            logger.info("Wrote file", path=str(path), size=len(content))
            return True
        except Exception as e:
            logger.error("Failed to write file", path=str(path), error=str(e))
            return False

    def delete(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> bool:
        """
        Delete a .xxp file.

        Also deletes any associated .xxp.err file.

        Args:
            username: Username who owns the file
            file_type: "experiments" or "workflows"
            file_name: Name without .xxp extension

        Returns:
            True if file was deleted (or didn't exist), False on error
        """
        path = self._get_safe_path(username, file_type, file_name)
        if path is None:
            logger.warning(
                "Invalid path for delete",
                username=username,
                file_type=file_type,
                file_name=file_name,
            )
            return False

        try:
            # Delete the main file
            if path.exists():
                path.unlink()
                logger.info("Deleted file", path=str(path))

            # Also delete any error file
            err_path = get_error_file_path(path)
            if err_path.exists():
                err_path.unlink()
                logger.info("Deleted error file", path=str(err_path))

            return True
        except Exception as e:
            logger.error("Failed to delete file", path=str(path), error=str(e))
            return False

    def rename(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        old_name: str,
        new_name: str,
    ) -> bool:
        """
        Rename a .xxp file.

        Args:
            username: Username who owns the file
            file_type: "experiments" or "workflows"
            old_name: Old name without .xxp extension
            new_name: New name without .xxp extension

        Returns:
            True if successful, False otherwise
        """
        old_path = self._get_safe_path(username, file_type, old_name)
        new_path = self._get_safe_path(username, file_type, new_name)

        if old_path is None or new_path is None:
            logger.warning(
                "Invalid path for rename",
                username=username,
                file_type=file_type,
                old_name=old_name,
                new_name=new_name,
            )
            return False

        if not old_path.exists():
            logger.warning("Source file not found for rename", path=str(old_path))
            return False

        if new_path.exists():
            logger.warning("Target file already exists", path=str(new_path))
            return False

        try:
            old_path.rename(new_path)
            logger.info("Renamed file", old_path=str(old_path), new_path=str(new_path))

            # Also rename error file if it exists
            old_err_path = get_error_file_path(old_path)
            if old_err_path.exists():
                new_err_path = get_error_file_path(new_path)
                old_err_path.rename(new_err_path)
                logger.info(
                    "Renamed error file",
                    old_path=str(old_err_path),
                    new_path=str(new_err_path),
                )

            return True
        except Exception as e:
            logger.error("Failed to rename file", error=str(e))
            return False

    def write_error(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
        error_content: str,
    ) -> bool:
        """
        Write an error file (.xxp.err) for a failed conversion.

        Args:
            username: Username who owns the file
            file_type: "experiments" or "workflows"
            file_name: Name without .xxp extension
            error_content: Error message to write

        Returns:
            True if successful, False otherwise
        """
        path = self._get_safe_path(username, file_type, file_name)
        if path is None:
            return False

        err_path = get_error_file_path(path)

        try:
            err_path.parent.mkdir(parents=True, exist_ok=True)
            err_path.write_text(error_content, encoding="utf-8")
            logger.info("Wrote error file", path=str(err_path))
            return True
        except Exception as e:
            logger.error("Failed to write error file", path=str(err_path), error=str(e))
            return False

    def delete_error(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
        file_name: str,
    ) -> bool:
        """
        Delete an error file if it exists.

        Called when a file is successfully converted after a previous failure.

        Args:
            username: Username who owns the file
            file_type: "experiments" or "workflows"
            file_name: Name without .xxp extension

        Returns:
            True if deleted or didn't exist, False on error
        """
        path = self._get_safe_path(username, file_type, file_name)
        if path is None:
            return False

        err_path = get_error_file_path(path)

        try:
            if err_path.exists():
                err_path.unlink()
                logger.info("Deleted error file", path=str(err_path))
            return True
        except Exception as e:
            logger.error("Failed to delete error file", path=str(err_path), error=str(e))
            return False

    def list_users(self) -> list[str]:
        """
        List all user directories in the workspace.

        Returns:
            List of usernames
        """
        try:
            return [
                d.name
                for d in self._workspace.iterdir()
                if d.is_dir() and not d.name.startswith(".")
            ]
        except Exception as e:
            logger.error("Failed to list users", error=str(e))
            return []

    def list_files(
        self,
        username: str,
        file_type: Literal["experiments", "workflows"],
    ) -> list[str]:
        """
        List all .xxp files for a user and file type.

        Args:
            username: Username
            file_type: "experiments" or "workflows"

        Returns:
            List of file names (without .xxp extension)
        """
        # Validate path components
        type_path = safe_path(self._workspace, username, file_type)
        if type_path is None:
            return []

        if not type_path.exists():
            return []

        try:
            files = []
            for f in type_path.glob("*.xxp"):
                # Skip error files
                if not is_error_file(f):
                    files.append(f.stem)
            return files
        except Exception as e:
            logger.error(
                "Failed to list files",
                username=username,
                file_type=file_type,
                error=str(e),
            )
            return []

    def ensure_user_directories(self, username: str) -> bool:
        """
        Ensure user directories exist (experiments/ and workflows/).

        Args:
            username: Username

        Returns:
            True if successful, False otherwise
        """
        for file_type in ("experiments", "workflows"):
            dir_path = safe_path(self._workspace, username, file_type)
            if dir_path is None:
                return False
            try:
                dir_path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                logger.error(
                    "Failed to create user directory",
                    username=username,
                    file_type=file_type,
                    error=str(e),
                )
                return False
        return True


# Global instance
_file_ops: FileOperations | None = None


def get_file_operations() -> FileOperations:
    """Get or create the global file operations instance."""
    global _file_ops
    if _file_ops is None:
        _file_ops = FileOperations()
    return _file_ops


def reset_file_operations() -> None:
    """Reset the global file operations (useful for testing)."""
    global _file_ops
    _file_ops = None
