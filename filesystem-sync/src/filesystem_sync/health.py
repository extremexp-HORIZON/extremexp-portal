"""
Health check HTTP server for the filesystem-sync service.

Provides a simple HTTP endpoint for Docker health checks and
monitoring tools to verify the service is running properly.
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

import structlog
import uvicorn
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route

if TYPE_CHECKING:
    from starlette.requests import Request

logger = structlog.get_logger(__name__)

# Health status tracking
_health_status = {
    "healthy": True,
    "database_connected": False,
    "file_watcher_running": False,
    "db_listener_running": False,
}


def set_health_status(key: str, value: bool) -> None:
    """Update a health status flag."""
    _health_status[key] = value


def get_health_status() -> dict:
    """Get the current health status."""
    return _health_status.copy()


async def healthz(request: Request) -> JSONResponse:
    """
    Health check endpoint.

    Returns 200 if healthy, 503 if unhealthy.
    """
    status = get_health_status()
    is_healthy = status.get("healthy", False)

    return JSONResponse(
        {"status": "ok" if is_healthy else "unhealthy", "details": status},
        status_code=200 if is_healthy else 503,
    )


async def readyz(request: Request) -> JSONResponse:
    """
    Readiness check endpoint.

    Returns 200 if the service is ready to accept work,
    meaning all components are initialized and running.
    """
    status = get_health_status()

    # Service is ready if all components are running
    is_ready = (
        status.get("database_connected", False)
        and status.get("file_watcher_running", False)
        and status.get("db_listener_running", False)
    )

    return JSONResponse(
        {"status": "ready" if is_ready else "not_ready", "details": status},
        status_code=200 if is_ready else 503,
    )


async def livez(request: Request) -> JSONResponse:
    """
    Liveness check endpoint.

    Returns 200 if the service is alive (not deadlocked).
    This is a simple check that always returns success if the server is responding.
    """
    return JSONResponse({"status": "alive"}, status_code=200)


# Create the Starlette app for health checks
routes = [
    Route("/healthz", healthz, methods=["GET"]),
    Route("/readyz", readyz, methods=["GET"]),
    Route("/livez", livez, methods=["GET"]),
]

health_app = Starlette(routes=routes)


class HealthCheckServer:
    """
    Background HTTP server for health checks.

    Runs alongside the main application on a separate port.
    """

    def __init__(self, host: str = "0.0.0.0", port: int = 8080):
        """
        Initialize the health check server.

        Args:
            host: Host to bind to
            port: Port to listen on
        """
        self._host = host
        self._port = port
        self._server: asyncio.Task | None = None

    async def start(self) -> None:
        """Start the health check server in the background."""
        config = uvicorn.Config(
            health_app,
            host=self._host,
            port=self._port,
            log_level="warning",
            access_log=False,
        )
        server = uvicorn.Server(config)

        # Run in background task
        self._server = asyncio.create_task(server.serve())
        logger.info(
            "Health check server started",
            host=self._host,
            port=self._port,
        )

    async def stop(self) -> None:
        """Stop the health check server."""
        if self._server is not None:
            self._server.cancel()
            try:
                await self._server
            except asyncio.CancelledError:
                pass
            self._server = None
            logger.info("Health check server stopped")
