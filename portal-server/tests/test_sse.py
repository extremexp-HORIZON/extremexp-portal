import asyncio
import json
import os
import socket
import threading
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
import pytest_asyncio
import uvicorn
from httpx import AsyncClient
from httpx_sse import aconnect_sse
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

from main import app, get_session
from database import build_async_database_url


# Helper to find a free port
def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


class SessionProvider:
    def __init__(self, schema: str):
        self.schema = schema
        self.engine = None
        self.session_maker = None
        self.database_url = build_async_database_url()

    async def __call__(self) -> AsyncIterator[AsyncSession]:
        if not self.engine:
            self.engine = create_async_engine(
                self.database_url,
                connect_args={"server_settings": {"search_path": self.schema}},
            )
            self.session_maker = async_sessionmaker(
                self.engine, expire_on_commit=False, class_=AsyncSession
            )

        if self.session_maker is None:
            raise RuntimeError("Session maker not initialized")

        async with self.session_maker() as session:
            yield session


@pytest_asyncio.fixture
async def client(test_schema: str) -> AsyncIterator[AsyncClient]:
    provider = SessionProvider(test_schema)
    app.dependency_overrides[get_session] = provider

    port = get_free_port()
    host = "127.0.0.1"
    config = uvicorn.Config(app, host=host, port=port, log_level="info")
    server = uvicorn.Server(config)

    thread = threading.Thread(target=server.run)
    thread.start()

    while not server.started:
        await asyncio.sleep(0.1)

    base_url = f"http://{host}:{port}"

    async with AsyncClient(base_url=base_url) as test_client:
        yield test_client

    server.should_exit = True
    thread.join()

    app.dependency_overrides.pop(get_session, None)
    if provider.engine:
        await provider.engine.dispose()


@pytest.mark.asyncio
async def test_sse_stream(client: AsyncClient):
    # Ensure mock auth is enabled
    os.environ["EXTREMEXP_AUTH_MODE"] = "mock"
    os.environ["EXTREMEXP_AUTH_MOCK_USER"] = "test-user"

    async def trigger_event():
        await asyncio.sleep(1.0)
        # print("Creating experiment to trigger event...")
        exp_name = f"exp-{uuid4().hex}"
        response = await client.post("/experiments", json={"name": exp_name})
        # print("Created experiment:", response.status_code, response.text)
        assert response.status_code == 201

    # Connect to SSE stream
    try:
        async with asyncio.timeout(10.0):
            async with aconnect_sse(client, "GET", "/events") as event_source:
                trigger_task = asyncio.create_task(trigger_event())

                async for sse in event_source.aiter_sse():
                    print(
                        f"Event: {sse.event}, Data: {sse.data}, ID: {sse.id}, Retry: {sse.retry}"
                    )
                    data = json.loads(sse.data)
                    if (
                        data.get("document_type") == "experiment"
                        and data.get("event_type") == "created"
                    ):
                        print("Received expected event!")
                        break
                    else:
                        print("Received unrelated event, continuing...")
                        continue

                await trigger_task
    except asyncio.TimeoutError:
        print("after timeout")
        pytest.fail("Timeout waiting for SSE event")
