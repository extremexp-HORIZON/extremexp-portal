from __future__ import annotations

from database import build_async_database_url, ensure_async_database_url


def test_build_async_database_url_prefers_database_url_value() -> None:
    env = {"DATABASE_URL": "postgresql+psycopg://user:pass@host/db"}
    result = build_async_database_url(env)
    assert result == "postgresql+asyncpg://user:pass@host/db"


def test_build_async_database_url_uses_postgres_components() -> None:
    env = {
        "POSTGRES_USER": "alice",
        "POSTGRES_PASSWORD": "secret",
        "POSTGRES_DB": "example",
        "POSTGRES_HOST": "postgres",
        "POSTGRES_PORT": "6543",
    }
    result = build_async_database_url(env)
    assert result == "postgresql+asyncpg://alice:secret@postgres:6543/example"
    url = "postgresql+psycopg_async://user:pass@host/db"
    assert ensure_async_database_url(url) == url
