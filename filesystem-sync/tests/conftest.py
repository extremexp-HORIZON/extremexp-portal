"""Pytest fixtures for filesystem-sync tests."""

import tempfile
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from filesystem_sync.config import Config, LogLevel, PostgresConfig, SyncMode
from filesystem_sync.sync.event_registry import EventRegistry


@pytest.fixture
def temp_workspace():
    """Create a temporary workspace directory."""
    with tempfile.TemporaryDirectory() as tmpdir:
        workspace = Path(tmpdir)
        yield workspace


@pytest.fixture
def test_config(temp_workspace: Path) -> Config:
    """Create a test configuration."""
    return Config(
        workspace_path=temp_workspace,
        postgres=PostgresConfig(
            host="localhost",
            port=5432,
            user="test",
            password="test",
            database="test",
        ),
        conversion_service_url="http://localhost:8080",
        sync_mode=SyncMode.WARN,
        log_level=LogLevel.DEBUG,
    )


@pytest.fixture
def event_registry() -> EventRegistry:
    """Create an event registry for testing."""
    return EventRegistry(expiry_seconds=6)


@pytest.fixture
def mock_async_session():
    """Create a mock async session."""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    session.refresh = AsyncMock()
    session.get = AsyncMock()
    session.delete = AsyncMock()
    return session


@pytest.fixture
def mock_httpx_client():
    """Create a mock httpx async client."""
    client = AsyncMock()
    client.post = AsyncMock()
    client.get = AsyncMock()
    return client
