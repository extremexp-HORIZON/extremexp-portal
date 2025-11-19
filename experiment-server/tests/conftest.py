from __future__ import annotations

import os
import sys
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Tuple
from uuid import uuid4

import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

ROOT_PATH = Path(__file__).resolve().parents[1]
if str(ROOT_PATH) not in sys.path:
    sys.path.insert(0, str(ROOT_PATH))

from database import build_async_database_url  # noqa: E402


DEFAULT_TEST_DB_URL = build_async_database_url({})


@pytest_asyncio.fixture(scope="session")
async def engine_and_schema() -> AsyncIterator[Tuple[AsyncEngine, str]]:
    """Create a dedicated schema for tests so we don't touch production data."""
    database_url = os.getenv("TEST_DATABASE_URL", DEFAULT_TEST_DB_URL)
    schema_name = os.getenv("TEST_SCHEMA_NAME", f"sqlmodel_test_{uuid4().hex}")

    engine = create_async_engine(
        database_url,
        # echo=False,
        # pool_pre_ping=True,
        # poolclass=NullPool,
        connect_args={"server_settings": {"search_path": schema_name}},
    )

    async with engine.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
        await connection.execute(text(f'SET search_path TO "{schema_name}"'))
        await connection.run_sync(SQLModel.metadata.create_all)

    try:
        yield engine, schema_name
    finally:
        async with engine.begin() as connection:
            await connection.execute(
                text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
            )
        await engine.dispose()


@pytest.fixture(scope="session")
def engine(engine_and_schema: Tuple[AsyncEngine, str]) -> AsyncEngine:
    return engine_and_schema[0]


@pytest.fixture(scope="session")
def test_schema(engine_and_schema: Tuple[AsyncEngine, str]) -> str:
    return engine_and_schema[1]


@pytest_asyncio.fixture
async def session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    async with engine.connect() as connection:
        transaction = await connection.begin()
        async_session = AsyncSession(bind=connection, expire_on_commit=False)
        try:
            yield async_session
        finally:
            await async_session.close()
            if transaction.is_active:
                await transaction.rollback()
