"""
HTTP client for the DMS DSL <-> JSON API.

The DMS service translates between:
- DSL format (.xxp file content) - used in the filesystem
- JSON format - used by the portal database model

Endpoints currently used by filesystem-sync:
- POST /experiment2dsl?scope=root - Experiment JSON to DSL
- POST /experiment/dsl2json - Experiment DSL to JSON (currently not implemented by DMS)
- POST /workflow2dsl?name=<name> - Workflow JSON to DSL
- POST /workflow2json - Workflow DSL to JSON
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Literal

import httpx
import structlog

from filesystem_sync.config import get_config

logger = structlog.get_logger(__name__)


@dataclass
class ConversionError:
    """Represents a conversion error with details for .err file."""

    timestamp: datetime
    service_url: str
    endpoint: str
    status_code: int | None
    error_message: str

    def to_error_file_content(self) -> str:
        """Format the error for writing to a .xxp.err file."""
        lines = [
            f"Conversion failed at {self.timestamp.isoformat()}",
            f"Service: {self.service_url}",
            f"Endpoint: {self.endpoint}",
        ]
        if self.status_code is not None:
            lines.append(f"Status: {self.status_code}")
        lines.append(f"Error: {self.error_message}")
        return "\n".join(lines)


@dataclass
class ConversionResult:
    """Result of a conversion operation."""

    success: bool
    data: dict[str, Any] | str | None = None  # JSON for dsl2*, DSL string for *2dsl
    error: ConversionError | None = None


class ConversionClient:
    """
    Async HTTP client for the DSL conversion service.

    Handles both experiment and workflow conversions with graceful error handling.
    """

    def __init__(
        self,
        base_url: str | None = None,
        timeout_seconds: float | None = None,
    ):
        """
        Initialize the conversion client.

        Args:
            base_url: Base URL of the conversion service (default from config)
            timeout_seconds: HTTP request timeout (default from config)
        """
        config = get_config()
        self._base_url = base_url or config.conversion_service_url
        self._timeout = timeout_seconds or config.http_timeout_seconds
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self._base_url,
                timeout=self._timeout,
            )
        return self._client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    def _create_error(
        self,
        endpoint: str,
        status_code: int | None,
        message: str,
    ) -> ConversionError:
        """Create a ConversionError with current timestamp."""
        return ConversionError(
            timestamp=datetime.now(UTC),
            service_url=self._base_url,
            endpoint=endpoint,
            status_code=status_code,
            error_message=message,
        )

    def _create_unsupported_error(self, endpoint: str, message: str) -> ConversionResult:
        """Return a standardized unsupported-operation error result."""
        return ConversionResult(
            success=False,
            error=self._create_error(
                endpoint=endpoint,
                status_code=None,
                message=message,
            ),
        )

    def _parse_json_response(self, endpoint: str, response: httpx.Response) -> ConversionResult:
        """Parse a successful JSON response with consistent error handling."""
        try:
            return ConversionResult(success=True, data=response.json())
        except ValueError as e:
            error = self._create_error(
                endpoint=endpoint,
                status_code=response.status_code,
                message=f"Invalid JSON response: {e}",
            )
            logger.error(
                "Conversion returned invalid JSON",
                endpoint=endpoint,
                status_code=response.status_code,
                response=response.text[:500],
            )
            return ConversionResult(success=False, error=error)

    async def dsl_to_experiment(self, name: str, dsl_content: str) -> ConversionResult:
        """
        Convert DSL content to experiment JSON.

        Args:
            name: Name of the experiment
            dsl_content: DSL format content from .xxp file

        Returns:
            ConversionResult with JSON data on success, error details on failure
        """
        endpoint = "/experiment/dsl2json"

        try:
            client = await self._get_client()
            response = await client.post(
                endpoint,
                content=dsl_content,
                headers={"Content-Type": "text/plain"},
            )

            if response.status_code == 200:
                if response.text.strip() == "NOT IMPLEMENTED YET":
                    logger.warning(
                        "DMS experiment DSL to JSON endpoint is not implemented",
                        name=name,
                    )
                    return self._create_unsupported_error(
                        endpoint=endpoint,
                        message=(
                            "DMS endpoint /experiment/dsl2json is not implemented yet. "
                            "Experiment .xxp imports cannot be synced to the database until the DMS service supports this conversion."
                        ),
                    )

                logger.info("Converted DSL to experiment JSON", name=name)
                return self._parse_json_response(endpoint, response)
            else:
                error = self._create_error(
                    endpoint=endpoint,
                    status_code=response.status_code,
                    message=response.text,
                )
                logger.error(
                    "DSL to experiment conversion failed",
                    name=name,
                    status_code=response.status_code,
                    response=response.text[:500],
                )
                return ConversionResult(success=False, error=error)

        except httpx.TimeoutException as e:
            error = self._create_error(
                endpoint=endpoint,
                status_code=None,
                message=f"Request timeout: {e}",
            )
            logger.error("DSL to experiment conversion timeout", name=name, error=str(e))
            return ConversionResult(success=False, error=error)

        except httpx.RequestError as e:
            error = self._create_error(
                endpoint=endpoint,
                status_code=None,
                message=f"Request error: {e}",
            )
            logger.error("DSL to experiment conversion request error", name=name, error=str(e))
            return ConversionResult(success=False, error=error)

    async def dsl_to_workflow(self, name: str, dsl_content: str) -> ConversionResult:
        """
        Convert DSL content to workflow JSON.

        Args:
            name: Name of the workflow
            dsl_content: DSL format content from .xxp file

        Returns:
            ConversionResult with JSON data on success, error details on failure
        """
        endpoint = "/workflow2json"

        try:
            client = await self._get_client()
            response = await client.post(
                endpoint,
                content=dsl_content,
                headers={"Content-Type": "text/plain"},
            )

            if response.status_code == 200:
                logger.info("Converted DSL to workflow JSON", name=name)
                return self._parse_json_response(endpoint, response)
            else:
                error = self._create_error(
                    endpoint=endpoint,
                    status_code=response.status_code,
                    message=response.text,
                )
                logger.error(
                    "DSL to workflow conversion failed",
                    name=name,
                    status_code=response.status_code,
                    response=response.text[:500],
                )
                return ConversionResult(success=False, error=error)

        except httpx.TimeoutException as e:
            error = self._create_error(
                endpoint=endpoint,
                status_code=None,
                message=f"Request timeout: {e}",
            )
            logger.error("DSL to workflow conversion timeout", name=name, error=str(e))
            return ConversionResult(success=False, error=error)

        except httpx.RequestError as e:
            error = self._create_error(
                endpoint=endpoint,
                status_code=None,
                message=f"Request error: {e}",
            )
            logger.error("DSL to workflow conversion request error", name=name, error=str(e))
            return ConversionResult(success=False, error=error)

    async def experiment_to_dsl(self, name: str, json_content: dict[str, Any]) -> ConversionResult:
        """
        Convert experiment JSON to DSL content.

        Args:
            name: Name of the experiment
            json_content: Experiment data as JSON

        Returns:
            ConversionResult with DSL string on success, error details on failure
        """
        endpoint = "/experiment2dsl"

        try:
            client = await self._get_client()
            response = await client.post(endpoint, params={"scope": "root"}, json=json_content)

            if response.status_code == 200:
                dsl_content = response.text
                logger.info("Converted experiment JSON to DSL", name=name)
                return ConversionResult(success=True, data=dsl_content)
            else:
                error = self._create_error(
                    endpoint=endpoint,
                    status_code=response.status_code,
                    message=response.text,
                )
                logger.error(
                    "Experiment to DSL conversion failed",
                    name=name,
                    status_code=response.status_code,
                    response=response.text[:500],
                )
                return ConversionResult(success=False, error=error)

        except httpx.TimeoutException as e:
            error = self._create_error(
                endpoint=endpoint,
                status_code=None,
                message=f"Request timeout: {e}",
            )
            logger.error("Experiment to DSL conversion timeout", name=name, error=str(e))
            return ConversionResult(success=False, error=error)

        except httpx.RequestError as e:
            error = self._create_error(
                endpoint=endpoint,
                status_code=None,
                message=f"Request error: {e}",
            )
            logger.error("Experiment to DSL conversion request error", name=name, error=str(e))
            return ConversionResult(success=False, error=error)

    async def workflow_to_dsl(self, name: str, json_content: dict[str, Any]) -> ConversionResult:
        """
        Convert workflow JSON to DSL content.

        Args:
            name: Name of the workflow
            json_content: Workflow data as JSON (graphical_model)

        Returns:
            ConversionResult with DSL string on success, error details on failure
        """
        endpoint = "/workflow2dsl"

        try:
            client = await self._get_client()
            response = await client.post(endpoint, params={"name": name}, json=json_content)

            if response.status_code == 200:
                dsl_content = response.text
                logger.info("Converted workflow JSON to DSL", name=name)
                return ConversionResult(success=True, data=dsl_content)
            else:
                error = self._create_error(
                    endpoint=endpoint,
                    status_code=response.status_code,
                    message=response.text,
                )
                logger.error(
                    "Workflow to DSL conversion failed",
                    name=name,
                    status_code=response.status_code,
                    response=response.text[:500],
                )
                return ConversionResult(success=False, error=error)

        except httpx.TimeoutException as e:
            error = self._create_error(
                endpoint=endpoint,
                status_code=None,
                message=f"Request timeout: {e}",
            )
            logger.error("Workflow to DSL conversion timeout", name=name, error=str(e))
            return ConversionResult(success=False, error=error)

        except httpx.RequestError as e:
            error = self._create_error(
                endpoint=endpoint,
                status_code=None,
                message=f"Request error: {e}",
            )
            logger.error("Workflow to DSL conversion request error", name=name, error=str(e))
            return ConversionResult(success=False, error=error)

    async def dsl_to_json(
        self,
        file_type: Literal["experiments", "workflows"],
        name: str,
        dsl_content: str,
    ) -> ConversionResult:
        """
        Convert DSL to JSON based on file type.

        Args:
            file_type: "experiments" or "workflows"
            name: Name of the entity
            dsl_content: DSL content from .xxp file

        Returns:
            ConversionResult with JSON data on success
        """
        if file_type == "experiments":
            return await self.dsl_to_experiment(name, dsl_content)
        else:
            return await self.dsl_to_workflow(name, dsl_content)

    async def json_to_dsl(
        self,
        file_type: Literal["experiments", "workflows"],
        name: str,
        json_content: dict[str, Any],
    ) -> ConversionResult:
        """
        Convert JSON to DSL based on file type.

        Args:
            file_type: "experiments" or "workflows"
            name: Name of the entity
            json_content: JSON data from database

        Returns:
            ConversionResult with DSL string on success
        """
        if file_type == "experiments":
            return await self.experiment_to_dsl(name, json_content)
        else:
            return await self.workflow_to_dsl(name, json_content)


# Global client instance
_client: ConversionClient | None = None


def get_conversion_client() -> ConversionClient:
    """Get or create the global conversion client."""
    global _client
    if _client is None:
        _client = ConversionClient()
    return _client


async def close_conversion_client() -> None:
    """Close the global conversion client."""
    global _client
    if _client is not None:
        await _client.close()
        _client = None
