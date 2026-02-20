"""Tests for repository module."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from filesystem_sync.db.repository import Repository


class TestRepository:
    """Tests for Repository methods."""

    @pytest.mark.asyncio
    async def test_get_user_by_username_returns_none_when_not_found(self):
        session = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        session.execute.return_value = result

        user = await Repository.get_user_by_username(session, "alice")

        assert user is None
        result.scalar_one_or_none.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_by_username_returns_user_when_found(self):
        session = AsyncMock()
        expected_user = object()

        result = MagicMock()
        result.scalar_one_or_none.return_value = expected_user
        session.execute.return_value = result

        user = await Repository.get_user_by_username(session, "alice")

        assert user is expected_user
        result.scalar_one_or_none.assert_called_once()
