from __future__ import annotations

import os
from collections.abc import Mapping

ASYNC_DRIVER = "postgresql+asyncpg"
SYNC_DRIVER = "postgresql+psycopg"
BARE_DRIVER = "postgresql"

DEFAULT_POSTGRES_SETTINGS = {
    "POSTGRES_USER": "postgres",
    "POSTGRES_PASSWORD": "postgres",
    "POSTGRES_DB": "extremexp",
    "POSTGRES_HOST": "localhost",
    "POSTGRES_PORT": "5432",
}

EnvMapping = Mapping[str, str]


def ensure_async_database_url(url: str) -> str:
    """Ensure a postgres URL uses the async psycopg driver dialect."""
    if url.startswith(f"{SYNC_DRIVER}://"):
        return url.replace(f"{SYNC_DRIVER}://", f"{ASYNC_DRIVER}://", 1)
    if url.startswith(f"{BARE_DRIVER}://"):
        return url.replace(f"{BARE_DRIVER}://", f"{ASYNC_DRIVER}://", 1)
    return url


def build_async_database_url(env: EnvMapping | None = None) -> str:
    """Return an async database URL using env overrides or defaults."""
    env_map = os.environ if env is None else env
    database_url = env_map.get("DATABASE_URL")
    if database_url:
        return ensure_async_database_url(database_url)

    config = {**DEFAULT_POSTGRES_SETTINGS, **env_map}
    return (
        f"{ASYNC_DRIVER}://{config['POSTGRES_USER']}:{config['POSTGRES_PASSWORD']}"
        f"@{config['POSTGRES_HOST']}:{config['POSTGRES_PORT']}/{config['POSTGRES_DB']}"
    )
