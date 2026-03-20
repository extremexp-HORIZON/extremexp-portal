"""Tests for config module."""

import os
from pathlib import Path
from unittest.mock import patch

from filesystem_sync.config import (
    Config,
    LogLevel,
    PostgresConfig,
    SyncMode,
    get_config,
    reset_config,
)


class TestPostgresConfig:
    """Tests for PostgresConfig."""

    def test_dsn_generation(self):
        config = PostgresConfig(
            host="localhost",
            port=5432,
            user="postgres",
            password="secret",
            database="testdb",
        )
        # dsn is without asyncpg driver for asyncpg-listen
        expected = "postgresql://postgres:secret@localhost:5432/testdb"
        assert config.dsn == expected

    def test_async_url_generation(self):
        config = PostgresConfig(
            host="localhost",
            port=5432,
            user="postgres",
            password="secret",
            database="testdb",
        )
        # async_url includes the asyncpg driver
        expected = "postgresql+asyncpg://postgres:secret@localhost:5432/testdb"
        assert config.async_url == expected

    def test_dsn_with_different_port(self):
        config = PostgresConfig(
            host="db.example.com",
            port=5433,
            user="admin",
            password="pass123",
            database="production",
        )
        expected = "postgresql://admin:pass123@db.example.com:5433/production"
        assert config.dsn == expected


class TestSyncMode:
    """Tests for SyncMode enum."""

    def test_sync_modes(self):
        assert SyncMode.WARN.value == "warn"
        assert SyncMode.SYNC.value == "sync"
        assert SyncMode.FULL.value == "full"

    def test_from_string(self):
        assert SyncMode("warn") == SyncMode.WARN
        assert SyncMode("sync") == SyncMode.SYNC
        assert SyncMode("full") == SyncMode.FULL


class TestLogLevel:
    """Tests for LogLevel enum."""

    def test_log_levels(self):
        assert LogLevel.DEBUG.value == "DEBUG"
        assert LogLevel.INFO.value == "INFO"
        assert LogLevel.WARNING.value == "WARNING"
        assert LogLevel.ERROR.value == "ERROR"


class TestConfig:
    """Tests for Config class."""

    def test_config_from_env(self, temp_workspace: Path):
        """Test config loading from environment variables."""
        env = {
            "POSTGRES_HOST": "localhost",
            "POSTGRES_PORT": "5432",
            "POSTGRES_USER": "user",
            "POSTGRES_PASSWORD": "pass",
            "POSTGRES_DB": "db",
            "WORKSPACE_PATH": str(temp_workspace),
        }
        with patch.dict(os.environ, env, clear=True):
            config = Config()

            assert config.postgres.host == "localhost"
            assert config.postgres.port == 5432
            assert config.postgres.user == "user"
            assert config.postgres.password == "pass"
            assert config.postgres.database == "db"
            assert config.workspace_path == temp_workspace
            assert config.sync_mode == SyncMode.WARN  # default
            assert config.log_level == LogLevel.INFO  # default

    def test_config_with_custom_values(self, temp_workspace: Path):
        """Test config loading with all values specified."""
        env = {
            "POSTGRES_HOST": "db.local",
            "POSTGRES_PORT": "5433",
            "POSTGRES_USER": "admin",
            "POSTGRES_PASSWORD": "secret",
            "POSTGRES_DB": "production",
            "WORKSPACE_PATH": str(temp_workspace),
            "DMS_SERVICE_URL": "http://dms:8866/api",
            "SYNC_MODE": "full",
            "LOG_LEVEL": "DEBUG",
        }
        with patch.dict(os.environ, env, clear=True):
            config = Config()

            assert config.postgres.host == "db.local"
            assert config.postgres.port == 5433
            assert config.conversion_service_url == "http://dms:8866/api"
            assert config.sync_mode == SyncMode.FULL
            assert config.log_level == LogLevel.DEBUG

    def test_config_supports_legacy_conversion_env_var(self, temp_workspace: Path):
        """Test the legacy conversion env var still works as a fallback."""
        env = {
            "POSTGRES_HOST": "localhost",
            "POSTGRES_PORT": "5432",
            "POSTGRES_USER": "user",
            "POSTGRES_PASSWORD": "pass",
            "POSTGRES_DB": "db",
            "WORKSPACE_PATH": str(temp_workspace),
            "CONVERSION_SERVICE_URL": "http://legacy-converter:8080",
        }

        with patch.dict(os.environ, env, clear=True):
            config = Config()

            assert config.conversion_service_url == "http://legacy-converter:8080"

    def test_get_config_singleton(self, temp_workspace: Path):
        """Test that get_config returns the same instance."""
        env = {
            "POSTGRES_HOST": "localhost",
            "POSTGRES_PORT": "5432",
            "POSTGRES_USER": "user",
            "POSTGRES_PASSWORD": "pass",
            "POSTGRES_DB": "db",
            "WORKSPACE_PATH": str(temp_workspace),
        }
        # Clear the singleton cache
        reset_config()

        with patch.dict(os.environ, env, clear=True):
            config1 = get_config()
            config2 = get_config()

            assert config1 is config2

        # Clean up
        reset_config()
