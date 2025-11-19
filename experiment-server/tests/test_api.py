from __future__ import annotations

import os
from collections.abc import AsyncIterator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncEngine
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from tests.conftest import DEFAULT_TEST_DB_URL

os.environ.setdefault(
    "DATABASE_URL", os.getenv("TEST_DATABASE_URL", DEFAULT_TEST_DB_URL)
)

from main import app, get_session
from sqlmodel_models import Category, Experiment, Task, User, Workflow


@pytest_asyncio.fixture
async def api_session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    session = AsyncSession(bind=engine, expire_on_commit=False)
    try:
        yield session
    finally:
        await session.close()
        async with engine.begin() as connection:
            for table in reversed(SQLModel.metadata.sorted_tables):
                await connection.execute(table.delete())


@pytest_asyncio.fixture
async def client(api_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    async def _override_session():
        try:
            yield api_session
        finally:
            api_session.expire_all()

    app.dependency_overrides[get_session] = _override_session
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_session, None)


@pytest.mark.asyncio
async def test_read_current_user_creates_user_record(
    client: AsyncClient, api_session: AsyncSession
) -> None:
    response = await client.get("/users/me")
    assert response.status_code == 200

    payload = response.json()
    assert payload["username"] == "test-user"

    result = await api_session.exec(select(User).where(User.username == "test-user"))
    user = result.one()
    assert user.display_name == "test-user"


@pytest.mark.asyncio
async def test_category_crud_flow(
    client: AsyncClient, api_session: AsyncSession
) -> None:
    unique_name = f"cat-{uuid4().hex}"
    create_response = await client.post(
        "/categories",
        json={"name": unique_name, "description": "My initial description"},
    )
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]

    list_response = await client.get("/categories")
    assert list_response.status_code == 200
    categories = list_response.json()
    assert any(category["id"] == category_id for category in categories)

    detail_response = await client.get(f"/categories/{category_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["description"] == "My initial description"

    update_response = await client.patch(
        f"/categories/{category_id}",
        json={"description": "Updated description"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["description"] == "Updated description"

    delete_response = await client.delete(f"/categories/{category_id}")
    assert delete_response.status_code == 204

    category = await api_session.get(Category, category_id)
    assert category is None


async def _create_category_for_tasks(client: AsyncClient) -> str:
    unique_name = f"task-cat-{uuid4().hex}"
    response = await client.post("/categories", json={"name": unique_name})
    assert response.status_code == 201
    return response.json()["id"]


@pytest.mark.asyncio
async def test_task_crud_flow(client: AsyncClient, api_session: AsyncSession) -> None:
    category_id = await _create_category_for_tasks(client)
    task_payload = {
        "name": f"task-{uuid4().hex}",
        "description": "Test task",
        "provider": "openai",
        "graphical_model": {"nodes": [], "edges": []},
        "category_id": category_id,
    }

    create_response = await client.post("/tasks", json=task_payload)
    assert create_response.status_code == 201
    task_id = create_response.json()["id"]

    list_response = await client.get("/tasks")
    assert list_response.status_code == 200
    tasks = list_response.json()
    assert any(task["id"] == task_id for task in tasks)

    update_response = await client.patch(
        f"/tasks/{task_id}",
        json={"description": "Updated", "provider": "anthropic"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["description"] == "Updated"
    assert updated["provider"] == "anthropic"

    delete_response = await client.delete(f"/tasks/{task_id}")
    assert delete_response.status_code == 204

    task = await api_session.get(Task, task_id)
    assert task is None


@pytest.mark.asyncio
async def test_experiment_crud_flow(
    client: AsyncClient, api_session: AsyncSession
) -> None:
    create_response = await client.post(
        "/experiments",
        json={"name": f"exp-{uuid4().hex}", "steps": [{"name": "step-1"}]},
    )
    assert create_response.status_code == 201
    experiment_id = create_response.json()["id"]

    list_response = await client.get("/experiments")
    assert list_response.status_code == 200
    experiments = list_response.json()
    assert any(experiment["id"] == experiment_id for experiment in experiments)

    update_response = await client.patch(
        f"/experiments/{experiment_id}",
        json={"steps": [{"name": "updated"}]},
    )
    assert update_response.status_code == 200
    assert update_response.json()["steps"] == [{"name": "updated"}]

    delete_response = await client.delete(f"/experiments/{experiment_id}")
    assert delete_response.status_code == 204

    experiment = await api_session.get(Experiment, experiment_id)
    assert experiment is None


@pytest.mark.asyncio
async def test_workflow_crud_flow(
    client: AsyncClient, api_session: AsyncSession
) -> None:
    create_response = await client.post(
        "/workflows",
        json={
            "name": f"wf-{uuid4().hex}",
            "graphical_model": {"nodes": [], "edges": []},
        },
    )
    assert create_response.status_code == 201
    workflow_id = create_response.json()["id"]

    list_response = await client.get("/workflows")
    assert list_response.status_code == 200
    workflows = list_response.json()
    assert any(workflow["id"] == workflow_id for workflow in workflows)

    update_response = await client.patch(
        f"/workflows/{workflow_id}",
        json={"graphical_model": {"nodes": [{"id": "n1"}], "edges": []}},
    )
    assert update_response.status_code == 200
    assert update_response.json()["graphical_model"]["nodes"] == [{"id": "n1"}]

    delete_response = await client.delete(f"/workflows/{workflow_id}")
    assert delete_response.status_code == 204

    workflow = await api_session.get(Workflow, workflow_id)
    assert workflow is None
