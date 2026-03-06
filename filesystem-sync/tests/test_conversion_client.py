"""Tests for the DMS conversion client."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from filesystem_sync.conversion.client import ConversionClient


class TestConversionClient:
    """Tests for DMS endpoint integration."""

    @pytest.mark.asyncio
    async def test_dsl_to_workflow_uses_workflow2json_endpoint(self):
        client = ConversionClient(base_url="http://dms:8866/api", timeout_seconds=5)
        http_client = AsyncMock()
        http_client.is_closed = False

        response = MagicMock(status_code=200, text='{"nodes": [], "edges": []}')
        response.json.return_value = {"nodes": [], "edges": []}
        http_client.post.return_value = response
        client._client = http_client

        result = await client.dsl_to_workflow("demo", "workflow demo")

        assert result.success is True
        assert result.data == {"nodes": [], "edges": []}
        http_client.post.assert_awaited_once_with(
            "/workflow2json",
            content="workflow demo",
            headers={"Content-Type": "text/plain"},
        )

    @pytest.mark.asyncio
    async def test_dsl_to_experiment_returns_clear_error_when_dms_lacks_support(self):
        client = ConversionClient(base_url="http://dms:8866/api", timeout_seconds=5)
        http_client = AsyncMock()
        http_client.is_closed = False

        response = MagicMock(status_code=200, text="NOT IMPLEMENTED YET")
        http_client.post.return_value = response
        client._client = http_client

        result = await client.dsl_to_experiment("demo", "experiment demo")

        assert result.success is False
        assert result.error is not None
        assert "not implemented yet" in result.error.error_message.lower()
        http_client.post.assert_awaited_once_with(
            "/experiment/dsl2json",
            content="experiment demo",
            headers={"Content-Type": "text/plain"},
        )

    @pytest.mark.asyncio
    async def test_experiment_to_dsl_uses_scope_root(self):
        client = ConversionClient(base_url="http://dms:8866/api", timeout_seconds=5)
        http_client = AsyncMock()
        http_client.is_closed = False

        response = MagicMock(status_code=200, text="experiment demo")
        http_client.post.return_value = response
        client._client = http_client

        result = await client.experiment_to_dsl("demo", {"experiment": {}, "workflows": []})

        assert result.success is True
        assert result.data == "experiment demo"
        http_client.post.assert_awaited_once_with(
            "/experiment2dsl",
            params={"scope": "root"},
            json={"experiment": {}, "workflows": []},
        )

    @pytest.mark.asyncio
    async def test_workflow_to_dsl_passes_name_as_query_param(self):
        client = ConversionClient(base_url="http://dms:8866/api", timeout_seconds=5)
        http_client = AsyncMock()
        http_client.is_closed = False

        response = MagicMock(status_code=200, text="workflow demo")
        http_client.post.return_value = response
        client._client = http_client

        result = await client.workflow_to_dsl("my flow", {"nodes": [], "edges": []})

        assert result.success is True
        assert result.data == "workflow demo"
        http_client.post.assert_awaited_once_with(
            "/workflow2dsl",
            params={"name": "my flow"},
            json={"nodes": [], "edges": []},
        )
