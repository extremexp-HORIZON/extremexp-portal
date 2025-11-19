from __future__ import annotations

from datetime import timezone

import pytest
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.engine import Engine
from sqlmodel import Session, select

from sqlmodel_models import Category, Experiment, Task, User, Workflow


def test_user_timestamps_are_populated(session: Session) -> None:
    user = User(username="alice")
    session.add(user)
    session.commit()
    session.refresh(user)

    assert user.id is not None
    assert user.created_at.tzinfo is not None
    assert user.updated_at.tzinfo is not None
    assert user.updated_at >= user.created_at


def test_user_updated_at_changes_on_update(session: Session) -> None:
    user = User(username="timestamp-updates")
    session.add(user)
    session.commit()
    session.refresh(user)

    original_updated_at = user.updated_at
    user.display_name = "Timestamp Updates"
    session.add(user)
    session.commit()
    session.refresh(user)

    assert user.updated_at >= original_updated_at
    assert user.updated_at.tzinfo is not None


def test_category_relationships_and_defaults(session: Session) -> None:
    user = User(username="category-owner")
    category = Category(name="my-category", description="Example", user=user)
    session.add(category)
    session.commit()
    session.refresh(category)
    session.refresh(user)

    assert category.user_id == user.id
    assert category.user is user
    assert category in user.categories


def test_category_official_cannot_reference_user(session: Session) -> None:
    user = User(username="category-check")
    category = Category(
        name="official-forbidden",
        is_official=True,
        user=user,
    )
    session.add(category)
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_category_official_without_user_is_allowed(session: Session) -> None:
    category = Category(
        name="official-allowed",
        is_official=True,
    )
    session.add(category)
    session.commit()
    session.refresh(category)

    assert category.user is None
    assert category.is_official is True


def _create_category_and_user(
    session: Session, *, category_name: str = "cat"
) -> tuple[User, Category]:
    user = User(username=f"user-{category_name}")
    category = Category(name=f"{category_name}-category", user=user)
    session.add(category)
    session.commit()
    session.refresh(user)
    session.refresh(category)
    return user, category


def test_task_requires_provider_when_user_defined(session: Session) -> None:
    user, category = _create_category_and_user(session, category_name="needs-provider")

    invalid_task = Task(
        name="invalid-task",
        category_id=category.id,
        user_id=user.id,
    )
    session.add(invalid_task)
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_task_user_relationships(session: Session) -> None:
    user, category = _create_category_and_user(session, category_name="relationship")

    task = Task(
        name="valid-task",
        category_id=category.id,
        user_id=user.id,
        provider="openai",
        description="A sample task",
    )
    session.add(task)
    session.commit()
    session.refresh(task)
    session.refresh(user)
    session.refresh(category)

    assert task.user is user
    assert task.category is category
    assert task in user.tasks
    assert task in category.tasks

    assert task.graphical_model == {"nodes": [], "edges": []}


def test_task_official_cannot_reference_user(session: Session) -> None:
    user, category = _create_category_and_user(session, category_name="official-task")

    task = Task(
        name="official-task",
        category_id=category.id,
        user_id=user.id,
        provider="provider",
        is_official=True,
    )
    session.add(task)
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()


def test_experiment_unique_per_user(session: Session) -> None:
    user = User(username="experimenter")
    session.add(user)
    session.commit()
    session.refresh(user)

    first = Experiment(user_id=user.id, name="duplicate-test")
    session.add(first)
    session.commit()
    session.refresh(first)

    duplicate = Experiment(user_id=user.id, name="duplicate-test")
    session.add(duplicate)
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()

    other_user = User(username="experimenter-2")
    session.add(other_user)
    session.commit()
    session.refresh(other_user)

    allowed = Experiment(user_id=other_user.id, name="duplicate-test")
    session.add(allowed)
    session.commit()
    session.refresh(allowed)

    assert allowed.steps == []
    assert allowed.graphical_model == {"nodes": [], "edges": []}


def test_workflow_unique_per_user(session: Session) -> None:
    user = User(username="workflow-owner")
    session.add(user)
    session.commit()
    session.refresh(user)

    first = Workflow(user_id=user.id, name="duplicate-workflow")
    session.add(first)
    session.commit()
    session.refresh(first)

    duplicate = Workflow(user_id=user.id, name="duplicate-workflow")
    session.add(duplicate)
    with pytest.raises(IntegrityError):
        session.commit()
    session.rollback()

    other_user = User(username="workflow-owner-2")
    session.add(other_user)
    session.commit()
    session.refresh(other_user)

    allowed = Workflow(user_id=other_user.id, name="duplicate-workflow")
    session.add(allowed)
    session.commit()
    session.refresh(allowed)

    assert allowed.graphical_model == {"nodes": [], "edges": []}


def test_indexes_exist(engine: Engine, test_schema: str) -> None:
    inspector = inspect(engine)
    category_indexes = {
        index["name"] for index in inspector.get_indexes("category", schema=test_schema)
    }
    task_indexes = {
        index["name"] for index in inspector.get_indexes("task", schema=test_schema)
    }
    experiment_indexes = {
        index["name"]
        for index in inspector.get_indexes("experiment", schema=test_schema)
    }
    workflow_indexes = {
        index["name"] for index in inspector.get_indexes("workflow", schema=test_schema)
    }

    assert {
        "ix_category_user_name_unique",
        "ix_category_official_name_unique",
        "ix_category_is_official",
        "ix_category_updated_at",
    }.issubset(category_indexes)

    assert {
        "ix_task_user_category_name_unique",
        "ix_task_official_category_name_unique",
        "ix_task_category_user",
        "ix_task_updated_at",
    }.issubset(task_indexes)

    assert {"ix_experiment_user_updated_at"} <= experiment_indexes
    assert {"ix_workflow_user_updated_at"} <= workflow_indexes


def test_partial_indexes_have_expected_filters(
    engine: Engine, test_schema: str
) -> None:
    statement = text(
        """
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = :schema
        """
    )
    with engine.connect() as connection:
        rows = connection.execute(statement, {"schema": test_schema}).fetchall()
    by_name: dict[str, str] = {row.indexname: row.indexdef for row in rows}

    assert "ix_category_official_name_unique" in by_name
    assert (
        "WHERE (USER_ID IS NULL)" in by_name["ix_category_official_name_unique"].upper()
    )

    assert "ix_task_user_category_name_unique" in by_name
    assert (
        "WHERE (USER_ID IS NOT NULL)"
        in by_name["ix_task_user_category_name_unique"].upper()
    )

    assert "ix_task_official_category_name_unique" in by_name
    assert (
        "WHERE (USER_ID IS NULL)"
        in by_name["ix_task_official_category_name_unique"].upper()
    )


def test_created_defaults_are_distinct(session: Session) -> None:
    user, category = _create_category_and_user(session, category_name="defaults")

    first_task = Task(
        name="first-default",
        category_id=category.id,
        user_id=user.id,
        provider="provider",
    )
    second_task = Task(
        name="second-default",
        category_id=category.id,
        user_id=user.id,
        provider="provider",
    )
    session.add_all([first_task, second_task])
    session.commit()
    session.refresh(first_task)
    session.refresh(second_task)

    assert first_task.graphical_model == {"nodes": [], "edges": []}
    assert second_task.graphical_model == {"nodes": [], "edges": []}
    assert first_task.graphical_model is not second_task.graphical_model


def test_timestamp_fields_use_utc(session: Session) -> None:
    user = User(username="utc-check")
    session.add(user)
    session.commit()
    session.refresh(user)

    assert user.created_at.tzinfo is not None
    assert user.created_at.tzinfo.utcoffset(user.created_at) == timezone.utc.utcoffset(
        user.created_at
    )


def test_user_crud_cycle(session: Session) -> None:
    user = User(username="crud-user", display_name="Initial")
    session.add(user)
    session.commit()
    session.refresh(user)

    fetched = session.get(User, user.id)
    assert fetched is user

    original_updated_at = user.updated_at
    user.display_name = "Updated"
    session.add(user)
    session.commit()
    session.refresh(user)

    assert user.display_name == "Updated"
    assert user.updated_at >= original_updated_at

    session.delete(user)
    session.commit()

    assert session.get(User, user.id) is None


def test_category_crud_cycle(session: Session) -> None:
    user = User(username="category-crud-owner")
    category = Category(name="crud-category", description="Initial", user=user)
    session.add(category)
    session.commit()
    session.refresh(category)

    fetched = session.exec(
        select(Category).where(Category.name == "crud-category")
    ).one()
    assert fetched is category
    assert fetched.user is user

    category.description = "Updated description"
    session.add(category)
    session.commit()
    session.refresh(category)

    assert category.description == "Updated description"

    session.delete(category)
    session.commit()

    assert session.get(Category, category.id) is None
    session.refresh(user)
    assert not user.categories


def test_task_crud_cycle(session: Session) -> None:
    user, category = _create_category_and_user(session, category_name="task-crud")
    task = Task(
        name="crud-task",
        category_id=category.id,
        user_id=user.id,
        provider="provider-a",
    )
    session.add(task)
    session.commit()
    session.refresh(task)

    fetched = session.get(Task, task.id)
    assert fetched is not None
    assert fetched is task
    assert fetched.provider == "provider-a"

    task.description = "Updated description"
    task.provider = "provider-b"
    session.add(task)
    session.commit()
    session.refresh(task)

    assert task.description == "Updated description"
    assert task.provider == "provider-b"

    session.delete(task)
    session.commit()

    assert session.get(Task, task.id) is None
    session.refresh(user)
    session.refresh(category)
    assert not user.tasks
    assert not category.tasks


def test_experiment_crud_cycle(session: Session) -> None:
    user = User(username="experiment-crud")
    session.add(user)
    session.commit()
    session.refresh(user)

    experiment = Experiment(user_id=user.id, name="crud-experiment")
    session.add(experiment)
    session.commit()
    session.refresh(experiment)

    fetched = session.exec(
        select(Experiment).where(
            Experiment.user_id == user.id, Experiment.name == "crud-experiment"
        )
    ).one()
    assert fetched is experiment

    experiment.steps = [{"step": "one"}]
    session.add(experiment)
    session.commit()
    session.refresh(experiment)

    assert experiment.steps == [{"step": "one"}]

    session.delete(experiment)
    session.commit()

    assert session.get(Experiment, experiment.id) is None
    session.refresh(user)
    assert not user.experiments


def test_workflow_crud_cycle(session: Session) -> None:
    user = User(username="workflow-crud")
    session.add(user)
    session.commit()
    session.refresh(user)

    workflow = Workflow(user_id=user.id, name="crud-workflow")
    session.add(workflow)
    session.commit()
    session.refresh(workflow)

    fetched = session.get(Workflow, workflow.id)
    assert fetched is workflow

    workflow.graphical_model = {"nodes": [{"id": "1"}], "edges": []}
    session.add(workflow)
    session.commit()
    session.refresh(workflow)

    assert workflow.graphical_model == {"nodes": [{"id": "1"}], "edges": []}

    session.delete(workflow)
    session.commit()

    assert session.get(Workflow, workflow.id) is None
    session.refresh(user)
    assert not user.workflows
