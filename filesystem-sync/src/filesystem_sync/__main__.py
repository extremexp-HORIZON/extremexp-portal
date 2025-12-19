"""
Entry point for filesystem-sync service.

Usage:
    python -m filesystem_sync [OPTIONS]

    Or via the installed script:
    filesystem-sync [OPTIONS]
"""

from __future__ import annotations

import asyncio
import logging
import sys

import click
import structlog

from filesystem_sync.config import get_config
from filesystem_sync.sync import SyncMode


def configure_logging(log_level: str) -> None:
    """Configure structured logging."""
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper()),
    )

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(colors=True),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, log_level.upper())),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


@click.command()
@click.option(
    "--sync-mode",
    type=click.Choice(["warn", "sync", "full"], case_sensitive=False),
    default=None,
    help="Initial sync mode: warn (log only), sync (add missing), full (delete orphans)",
)
@click.option(
    "--log-level",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR"], case_sensitive=False),
    default=None,
    help="Log level (default: from SYNC_LOG_LEVEL env or INFO)",
)
@click.option(
    "--workspace",
    type=click.Path(exists=False),
    default=None,
    help="Workspace path (default: from WORKSPACE_PATH env or /workspace)",
)
@click.version_option(package_name="filesystem-sync")
def main(
    sync_mode: str | None,
    log_level: str | None,
    workspace: str | None,
) -> None:
    """
    Filesystem-sync service.

    Synchronizes experiments and workflows between the filesystem and PostgreSQL.
    The filesystem is the source of truth.
    """
    # Get config (loads from environment)
    config = get_config()

    # Override with CLI options
    effective_log_level = log_level or config.log_level.value
    configure_logging(effective_log_level)

    logger = structlog.get_logger(__name__)

    logger.info(
        "Starting filesystem-sync",
        workspace=workspace or str(config.workspace_path),
        sync_mode=sync_mode or config.sync_mode.value,
        log_level=effective_log_level,
    )

    # Parse sync mode
    mode: SyncMode | None = None
    if sync_mode:
        mode = SyncMode(sync_mode.lower())

    # Override workspace if provided
    if workspace:
        import os

        os.environ["WORKSPACE_PATH"] = workspace
        from filesystem_sync.config import reset_config

        reset_config()

    # Run the application
    from filesystem_sync.app import run_app

    try:
        asyncio.run(run_app(mode))
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error("Application failed", error=str(e), exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
