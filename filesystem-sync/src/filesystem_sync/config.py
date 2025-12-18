"""
Configuration management for filesystem-sync service.

Environment variables are loaded from .env file if present.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

from dotenv import load_dotenv

# Load .env file if it exists
load_dotenv()


class SyncMode(str, Enum):
    """Initial sync mode on startup."""

    WARN = "warn"  # Only log discrepancies
    SYNC = "sync"  # Sync filesystem to DB (add missing, update existing)
    FULL = "full"  # Full reconciliation (also delete DB records without files)


class LogLevel(str, Enum):
    """Log level options."""

    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


@dataclass(frozen=True)
class PostgresConfig:
    """PostgreSQL connection configuration."""

    host: str = field(default_factory=lambda: os.getenv("POSTGRES_HOST", "localhost"))
    port: int = field(default_factory=lambda: int(os.getenv("POSTGRES_PORT", "5432")))
    user: str = field(default_factory=lambda: os.getenv("POSTGRES_USER", "postgres"))
    password: str = field(default_factory=lambda: os.getenv("POSTGRES_PASSWORD", "postgres"))
    database: str = field(default_factory=lambda: os.getenv("POSTGRES_DB", "extremexp"))

    @property
    def async_url(self) -> str:
        """Build async PostgreSQL URL."""
        return (
            f"postgresql+asyncpg://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.database}"
        )

    @property
    def dsn(self) -> str:
        """Build PostgreSQL DSN for asyncpg-listen (without driver prefix)."""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


@dataclass(frozen=True)
class Config:
    """Main configuration for filesystem-sync service."""

    # Workspace path
    workspace_path: Path = field(
        default_factory=lambda: Path(os.getenv("WORKSPACE_PATH", "/workspace"))
    )

    # Database configuration
    postgres: PostgresConfig = field(default_factory=PostgresConfig)

    # External service URLs
    conversion_service_url: str = field(
        default_factory=lambda: os.getenv(
            "CONVERSION_SERVICE_URL", "http://host.docker.internal:8866/api"
        )
    )
    emf_service_url: str = field(
        default_factory=lambda: os.getenv("EMF_SERVICE_URL", "http://emf-cloud-service:8081/api/v2")
    )

    # Sync configuration
    sync_mode: SyncMode = field(
        default_factory=lambda: SyncMode(os.getenv("SYNC_MODE", "warn").lower())
    )

    # Logging
    log_level: LogLevel = field(
        default_factory=lambda: LogLevel(os.getenv("LOG_LEVEL", "INFO").upper())
    )

    # Event registry settings
    ignore_expiry_seconds: float = field(
        default_factory=lambda: float(os.getenv("IGNORE_EXPIRY_SECONDS", "6"))
    )

    # HTTP client settings
    http_timeout_seconds: float = field(
        default_factory=lambda: float(os.getenv("HTTP_TIMEOUT_SECONDS", "30"))
    )

    def __post_init__(self) -> None:
        """Validate configuration after initialization."""
        # Ensure workspace path is absolute
        if not self.workspace_path.is_absolute():
            object.__setattr__(self, "workspace_path", self.workspace_path.resolve())


# Global configuration instance (lazy-loaded)
_config: Config | None = None


def get_config() -> Config:
    """Get the global configuration instance."""
    global _config
    if _config is None:
        _config = Config()
    return _config


def reset_config() -> None:
    """Reset the global configuration (useful for testing)."""
    global _config
    _config = None
