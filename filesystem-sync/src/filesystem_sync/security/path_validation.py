"""
Path validation and traversal prevention utilities.

CRITICAL: All file operations MUST validate paths to prevent directory traversal attacks.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

# Validation constants
MAX_USERNAME_LENGTH = 255
MAX_FILENAME_LENGTH = 120

# Safe name pattern: alphanumeric, underscore, hyphen, dot
# Does not allow consecutive dots to prevent .. traversal
SAFE_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9_\-]+(?:\.[a-zA-Z0-9_\-]+)*$")

# Valid file types (subdirectory names)
VALID_FILE_TYPES = frozenset({"experiments", "workflows"})


@dataclass(frozen=True)
class PathInfo:
    """Parsed information from an .xxp file path."""

    username: str
    file_type: Literal["experiments", "workflows"]
    file_name: str  # Without .xxp extension
    full_path: Path


def validate_safe_name(name: str, max_length: int) -> bool:
    """
    Validate a name component is safe for filesystem use.

    Args:
        name: The name to validate
        max_length: Maximum allowed length

    Returns:
        True if the name is safe, False otherwise
    """
    if not name:
        return False

    if len(name) > max_length:
        return False

    # Check for null bytes
    if "\x00" in name:
        return False

    # Reject . and .. explicitly
    if name in (".", ".."):
        return False

    # Check pattern
    if not SAFE_NAME_PATTERN.match(name):
        return False

    return True


def safe_path(workspace_root: Path, *components: str) -> Path | None:
    """
    Construct a safe path within workspace, returning None if unsafe.

    This function:
    - Validates each component
    - Resolves to absolute path
    - Verifies result is within workspace_root

    Args:
        workspace_root: The workspace root directory (must be absolute)
        *components: Path components to join

    Returns:
        The resolved path if safe, None if any validation fails
    """
    # Ensure workspace_root is resolved
    workspace_root = workspace_root.resolve()

    if not components:
        return workspace_root

    # Build path from validated components
    target = workspace_root
    for i, component in enumerate(components):
        # Determine max length based on position
        # First component is username, last might be filename
        if i == 0:
            max_len = MAX_USERNAME_LENGTH
        else:
            max_len = MAX_FILENAME_LENGTH

        if not validate_safe_name(component, max_len):
            return None

        target = target / component

    # Resolve and verify containment
    resolved = target.resolve()
    try:
        resolved.relative_to(workspace_root)
    except ValueError:
        # Path escaped workspace
        return None

    return resolved


def parse_xxp_path(file_path: Path, workspace_root: Path) -> PathInfo | None:
    """
    Parse an .xxp file path to extract username, file type, and name.

    Expected structure: /workspace/<username>/<experiments|workflows>/<name>.xxp

    Args:
        file_path: Path to the .xxp file
        workspace_root: The workspace root directory

    Returns:
        PathInfo with parsed components, or None if path is invalid
    """
    # Resolve both paths
    file_path = file_path.resolve()
    workspace_root = workspace_root.resolve()

    # Verify the file is within workspace
    try:
        rel_path = file_path.relative_to(workspace_root)
    except ValueError:
        return None

    # Expected structure: <username>/<type>/<filename>.xxp
    parts = rel_path.parts
    if len(parts) != 3:
        return None

    username, file_type, filename = parts

    # Validate file type
    if file_type not in VALID_FILE_TYPES:
        return None

    # Validate filename has .xxp extension
    if not filename.endswith(".xxp"):
        return None

    # Extract name without extension
    file_name = filename[:-4]  # Remove .xxp

    # Validate components
    if not validate_safe_name(username, MAX_USERNAME_LENGTH):
        return None
    if not validate_safe_name(file_name, MAX_FILENAME_LENGTH):
        return None

    return PathInfo(
        username=username,
        file_type=file_type,  # type: ignore[arg-type]
        file_name=file_name,
        full_path=file_path,
    )


def is_error_file(file_path: Path) -> bool:
    """Check if a file is an error file (.xxp.err)."""
    return file_path.name.endswith(".xxp.err")


def get_error_file_path(xxp_path: Path) -> Path:
    """Get the error file path for an .xxp file."""
    return xxp_path.with_suffix(".xxp.err")


def get_xxp_path_from_error(err_path: Path) -> Path:
    """Get the .xxp file path from an error file path."""
    # Remove the .err suffix
    name = err_path.name
    if name.endswith(".xxp.err"):
        return err_path.with_name(name[:-4])  # Remove .err
    return err_path
