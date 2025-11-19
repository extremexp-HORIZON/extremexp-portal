from __future__ import annotations

import os
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Tuple
from uuid import uuid4

import pytest
from sqlalchemy import event, text
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

ROOT_PATH = Path(__file__).resolve().parents[1]
if str(ROOT_PATH) not in sys.path:
    sys.path.insert(0, str(ROOT_PATH))


DEFAULT_TEST_DB_URL = "postgresql+psycopg://admin:admin@localhost/extremexp"


@pytest.fixture(scope="session")
def engine_and_schema() -> Iterator[Tuple[Engine, str]]:
    """Create a dedicated schema for tests so we don't touch production data."""
    database_url = os.getenv("TEST_DATABASE_URL", DEFAULT_TEST_DB_URL)
    schema_name = os.getenv("TEST_SCHEMA_NAME", f"sqlmodel_test_{uuid4().hex}")

    engine = create_engine(database_url, echo=False, pool_pre_ping=True)

    def _set_search_path(dbapi_connection, connection_record) -> None:
        with dbapi_connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema_name}"')

    event.listen(engine, "connect", _set_search_path)

    with engine.connect() as conn:
        conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
        conn.execute(text(f'SET search_path TO "{schema_name}"'))
        conn.commit()

    SQLModel.metadata.create_all(engine)

    try:
        yield engine, schema_name
    finally:
        with engine.connect() as conn:
            conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))
            conn.commit()
        event.remove(engine, "connect", _set_search_path)
        engine.dispose()


@pytest.fixture(scope="session")
def engine(engine_and_schema: Tuple[Engine, str]) -> Engine:
    return engine_and_schema[0]


@pytest.fixture(scope="session")
def test_schema(engine_and_schema: Tuple[Engine, str]) -> str:
    return engine_and_schema[1]


@pytest.fixture
def session(engine: Engine) -> Iterator[Session]:
    with engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, expire_on_commit=False)
        try:
            yield session
        finally:
            session.close()
            if transaction.is_active:
                transaction.rollback()
