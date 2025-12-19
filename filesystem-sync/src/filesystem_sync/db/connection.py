"""
Database connection management.

Provides async SQLAlchemy engine and session factories for PostgreSQL.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel import SQLModel

from filesystem_sync.config import get_config

logger = structlog.get_logger(__name__)

# Global engine instance
_engine: AsyncEngine | None = None


def get_async_engine() -> AsyncEngine:
    """Get or create the async database engine."""
    global _engine
    if _engine is None:
        config = get_config()
        _engine = create_async_engine(
            config.postgres.async_url,
            echo=False,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
        )
        logger.info(
            "Created async database engine",
            host=config.postgres.host,
            database=config.postgres.database,
        )
    return _engine


async def init_db() -> None:
    """
    Initialize the database (create tables if needed).

    Note: In production, use Alembic migrations instead.
    This is primarily for testing.
    """
    engine = get_async_engine()
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    logger.info("Database tables initialized")


async def close_db() -> None:
    """Close the database engine."""
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        logger.info("Database engine closed")


@asynccontextmanager
async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get an async database session.

    Usage:
        async with get_async_session() as session:
            # Use session
    """
    engine = get_async_engine()
    async_session_factory = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
