from __future__ import annotations

import os
from uuid import uuid4
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, select

from tests.conftest import DEFAULT_TEST_DB_URL

os.environ.setdefault(
    "DATABASE_URL", os.getenv("TEST_DATABASE_URL", DEFAULT_TEST_DB_URL)
)

from main import app, get_session
from sqlmodel_models import (
    Category,
    Experiment,
    Task,
    User,
    Workflow,
)


@pytest.fixture
def api_session(engine: Engine) -> Generator[Session, None, None]:
    session = Session(engine, expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        with engine.begin() as connection:
            for table in reversed(SQLModel.metadata.sorted_tables):
                connection.execute(table.delete())


@pytest.fixture
def client(api_session: Session) -> Generator[TestClient, None, None]:
    def _override_session():
        try:
            yield api_session
        finally:
            api_session.expire_all()

    app.dependency_overrides[get_session] = _override_session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_session, None)


def test_read_current_user_creates_user_record(
    client: TestClient, api_session: Session
) -> None:
    response = client.get("/users/me")
    assert response.status_code == 200

    payload = response.json()
    assert payload["username"] == "test-user"

    user = api_session.exec(select(User).where(User.username == "test-user")).one()
    assert user.display_name == "test-user"


def test_category_crud_flow(client: TestClient, api_session: Session) -> None:
    unique_name = f"cat-{uuid4().hex}"
    create_response = client.post(
        "/categories",
        json={"name": unique_name, "description": "My initial description"},
    )
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]

    list_response = client.get("/categories")
    assert list_response.status_code == 200
    categories = list_response.json()
    assert any(category["id"] == category_id for category in categories)

    detail_response = client.get(f"/categories/{category_id}")
    assert detail_response.status_code == 200
    assert detail_response.json()["description"] == "My initial description"

    update_response = client.patch(
        f"/categories/{category_id}",
        json={"description": "Updated description"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["description"] == "Updated description"

    delete_response = client.delete(f"/categories/{category_id}")
    assert delete_response.status_code == 204

    assert api_session.get(Category, category_id) is None


def _create_category_for_tasks(client: TestClient) -> str:
    unique_name = f"task-cat-{uuid4().hex}"
    response = client.post("/categories", json={"name": unique_name})
    assert response.status_code == 201
    return response.json()["id"]


def test_task_crud_flow(client: TestClient, api_session: Session) -> None:
    category_id = _create_category_for_tasks(client)
    task_payload = {
        "name": f"task-{uuid4().hex}",
        "description": "Test task",
        "provider": "openai",
        "graphical_model": {"nodes": [], "edges": []},
        "category_id": category_id,
    }

    create_response = client.post("/tasks", json=task_payload)
    assert create_response.status_code == 201
    task_id = create_response.json()["id"]

    list_response = client.get("/tasks")
    assert list_response.status_code == 200
    tasks = list_response.json()
    assert any(task["id"] == task_id for task in tasks)

    update_response = client.patch(
        f"/tasks/{task_id}",
        json={"description": "Updated", "provider": "anthropic"},
    )
    assert update_response.status_code == 200
    updated = update_response.json()
    assert updated["description"] == "Updated"
    assert updated["provider"] == "anthropic"

    delete_response = client.delete(f"/tasks/{task_id}")
    assert delete_response.status_code == 204

    assert api_session.get(Task, task_id) is None


def test_experiment_crud_flow(client: TestClient, api_session: Session) -> None:
    create_response = client.post(
        "/experiments",
        json={"name": f"exp-{uuid4().hex}", "steps": [{"name": "step-1"}]},
    )
    assert create_response.status_code == 201
    experiment_id = create_response.json()["id"]

    list_response = client.get("/experiments")
    assert list_response.status_code == 200
    experiments = list_response.json()
    assert any(experiment["id"] == experiment_id for experiment in experiments)

    update_response = client.patch(
        f"/experiments/{experiment_id}",
        json={"steps": [{"name": "updated"}]},
    )
    assert update_response.status_code == 200
    assert update_response.json()["steps"] == [{"name": "updated"}]

    delete_response = client.delete(f"/experiments/{experiment_id}")
    assert delete_response.status_code == 204

    assert api_session.get(Experiment, experiment_id) is None


def test_workflow_crud_flow(client: TestClient, api_session: Session) -> None:
    create_response = client.post(
        "/workflows",
        json={
            "name": f"wf-{uuid4().hex}",
            "graphical_model": {"nodes": [], "edges": []},
        },
    )
    assert create_response.status_code == 201
    workflow_id = create_response.json()["id"]

    list_response = client.get("/workflows")
    assert list_response.status_code == 200
    workflows = list_response.json()
    assert any(workflow["id"] == workflow_id for workflow in workflows)

    update_response = client.patch(
        f"/workflows/{workflow_id}",
        json={"graphical_model": {"nodes": [{"id": "n1"}], "edges": []}},
    )
    assert update_response.status_code == 200
    assert update_response.json()["graphical_model"]["nodes"] == [{"id": "n1"}]

    delete_response = client.delete(f"/workflows/{workflow_id}")
    assert delete_response.status_code == 204

    assert api_session.get(Workflow, workflow_id) is None
