from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated, Any
from uuid import UUID

from alembic import command
from alembic.config import Config
from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ConfigDict
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession
from dotenv import load_dotenv

import structlog
from sqlmodel_models import Category, Experiment, Task, User, Workflow
from database import build_async_database_url
from logging_config import setup_logging, LoggingMiddleware
from middleware import ConditionalBacinetMiddleware
from auth import AuthCredentials, resolve_username

load_dotenv()

setup_logging()
logger = structlog.get_logger(__name__)

DATABASE_URL = build_async_database_url()

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:7001",
    "http://localhost:8082",
]
_cors_origins_raw = os.getenv("CORS_ALLOWED_ORIGINS")


def _parse_allowed_origins(raw_origins: str | None) -> list[str]:
    if not raw_origins:
        return DEFAULT_ALLOWED_ORIGINS

    origins = [origin.strip() for origin in raw_origins.split(",")]
    return [origin for origin in origins if origin]


ALLOWED_ORIGINS = _parse_allowed_origins(_cors_origins_raw)

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
)
async_session_factory = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Database tables are now managed by Alembic migrations
    # Run migrations on startup
    current_dir = os.path.dirname(os.path.abspath(__file__))
    alembic_cfg_path = os.path.join(current_dir, "alembic.ini")
    alembic_cfg = Config(alembic_cfg_path)

    # Run the migration in a separate thread to avoid blocking the event loop
    await asyncio.to_thread(command.upgrade, alembic_cfg, "head")
    logger.info("Database migrations applied successfully.")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(LoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.add_middleware(ConditionalBacinetMiddleware)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_session)]


def get_current_username(credentials: AuthCredentials) -> str:
    return resolve_username(credentials)


async def get_current_user(
    session: SessionDep,
    username: Annotated[str, Depends(get_current_username)],
) -> User:
    statement = select(User).where(User.username == username)
    result = await session.exec(statement)
    user = result.first()
    if user is None:
        user = User(username=username, display_name=username)
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


class UserRead(SQLModel):
    model_config = ConfigDict(from_attributes=True)  # pyright: ignore[reportAssignmentType]

    id: UUID
    username: str
    display_name: str | None
    created_at: datetime
    updated_at: datetime


class CategoryBase(SQLModel):
    name: str
    description: str | None = None


class CategoryCreate(CategoryBase):
    model_config = ConfigDict(extra="forbid")  # pyright: ignore[reportAssignmentType]


class CategoryUpdate(SQLModel):
    model_config = ConfigDict(extra="forbid")  # pyright: ignore[reportAssignmentType]

    name: str | None = None
    description: str | None = None


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)  # pyright: ignore[reportAssignmentType]

    id: UUID
    is_official: bool
    created_at: datetime
    updated_at: datetime


class TaskBase(SQLModel):
    name: str
    description: str | None = None
    provider: str
    graphical_model: dict[str, Any] | None = None


class TaskCreate(TaskBase):
    model_config = ConfigDict(extra="forbid")  # pyright: ignore[reportAssignmentType]

    category_id: UUID


class TaskUpdate(SQLModel):
    model_config = ConfigDict(extra="forbid")  # pyright: ignore[reportAssignmentType]

    name: str | None = None
    description: str | None = None
    provider: str | None = None
    graphical_model: dict[str, Any] | None = None


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)  # pyright: ignore[reportAssignmentType]

    id: UUID
    category_id: UUID
    user_id: UUID | None
    is_official: bool
    created_at: datetime
    updated_at: datetime


class ExperimentBase(SQLModel):
    name: str
    steps: list[dict[str, Any]] | None = None
    graphical_model: dict[str, Any] | None = None


class ExperimentCreate(ExperimentBase):
    model_config = ConfigDict(extra="forbid")  # pyright: ignore[reportAssignmentType]


class ExperimentUpdate(SQLModel):
    model_config = ConfigDict(extra="forbid")  # pyright: ignore[reportAssignmentType]

    name: str | None = None
    steps: list[dict[str, Any]] | None = None
    graphical_model: dict[str, Any] | None = None


class ExperimentRead(ExperimentBase):
    model_config = ConfigDict(from_attributes=True)  # pyright: ignore[reportAssignmentType]

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


class WorkflowBase(SQLModel):
    name: str
    graphical_model: dict[str, Any] | None = None


class WorkflowCreate(WorkflowBase):
    model_config = ConfigDict(extra="forbid")  # pyright: ignore[reportAssignmentType]


class WorkflowUpdate(SQLModel):
    model_config = ConfigDict(extra="forbid")  # pyright: ignore[reportAssignmentType]

    name: str | None = None
    graphical_model: dict[str, Any] | None = None


class WorkflowRead(WorkflowBase):
    model_config = ConfigDict(from_attributes=True)  # pyright: ignore[reportAssignmentType]

    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime


def _ensure_category_editable(category: Category, user: User) -> None:
    if category.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Category is not editable",
        )


def _ensure_task_editable(task: Task, user: User) -> None:
    if task.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Task is not editable",
        )


def _ensure_experiment_editable(experiment: Experiment, user: User) -> None:
    if experiment.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Experiment is not editable",
        )


def _ensure_workflow_editable(workflow: Workflow, user: User) -> None:
    if workflow.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workflow is not editable",
        )


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/users/me", response_model=UserRead)
def read_current_user(user: CurrentUserDep) -> User:
    return user


@app.get("/categories", response_model=list[CategoryRead])
async def list_categories(
    session: SessionDep,
    user: CurrentUserDep,
) -> list[Category]:
    statement = (
        select(Category)
        .where(
            or_(
                Category.user_id == user.id,  # pyright: ignore[reportArgumentType]
                Category.is_official.is_(  # pyright: ignore[reportAttributeAccessIssue]
                    True
                ),
            )
        )
        .order_by(
            Category.created_at.desc()  # pyright: ignore[reportAttributeAccessIssue]
        )
    )
    categories = await session.exec(statement)
    return list(categories.all())


@app.post(
    "/categories",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_category(
    payload: CategoryCreate,
    session: SessionDep,
    user: CurrentUserDep,
) -> Category:
    result = await session.exec(
        select(Category).where(
            Category.user_id == user.id, Category.name == payload.name
        )
    )
    duplicate = result.first()
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A category with this name already exists.",
        )
    category = Category(
        name=payload.name,
        description=payload.description or "",
        user_id=user.id,
        is_official=False,
    )
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category


@app.get("/categories/{category_id}", response_model=CategoryRead)
async def read_category(
    category_id: UUID,
    session: SessionDep,
    user: CurrentUserDep,
) -> Category:
    category = await session.get(Category, category_id)
    if not category or not (category.is_official or category.user_id == user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    return category


@app.patch("/categories/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: UUID,
    payload: CategoryUpdate,
    session: SessionDep,
    user: CurrentUserDep,
) -> Category:
    category = await session.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    _ensure_category_editable(category, user)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        result = await session.exec(
            select(Category).where(
                Category.user_id == user.id,
                Category.name == data["name"],
                Category.id != category.id,
            )
        )
        duplicate = result.first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A category with this name already exists.",
            )
    for field, value in data.items():
        setattr(category, field, value if value is not None else "")
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category


@app.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: UUID,
    session: SessionDep,
    user: CurrentUserDep,
) -> Response:
    category = await session.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    _ensure_category_editable(category, user)
    await session.delete(category)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _get_category_for_task(
    session: AsyncSession,
    user: User,
    category_id: UUID,
) -> Category:
    category = await session.get(Category, category_id)
    if category is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Category not found"
        )
    if category.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot attach task to this category.",
        )
    return category


def _ensure_provider_present(provider: str | None) -> None:
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Task provider is required.",
        )


@app.get("/tasks", response_model=list[TaskRead])
async def list_tasks(
    session: SessionDep,
    user: CurrentUserDep,
    category_id: UUID | None = None,
) -> list[Task]:
    statement = select(Task).where(
        or_(
            Task.user_id == user.id,  # pyright: ignore[reportArgumentType]
            Task.is_official.is_(True),  # pyright: ignore[reportAttributeAccessIssue]
        )
    )
    if category_id:
        statement = statement.where(Task.category_id == category_id)
    tasks = await session.exec(
        statement.order_by(
            Task.created_at.desc()  # pyright: ignore[reportAttributeAccessIssue]
        )
    )
    return list(tasks.all())


@app.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    session: SessionDep,
    user: CurrentUserDep,
) -> Task:
    _ensure_provider_present(payload.provider)
    await _get_category_for_task(session, user, payload.category_id)
    result = await session.exec(
        select(Task).where(
            Task.user_id == user.id,
            Task.category_id == payload.category_id,
            Task.name == payload.name,
        )
    )
    duplicate = result.first()
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A task with this name already exists in this category.",
        )
    task = Task(
        name=payload.name,
        description=payload.description or "",
        provider=payload.provider,
        graphical_model=payload.graphical_model or {"nodes": [], "edges": []},
        category_id=payload.category_id,
        user_id=user.id,
        is_official=False,
    )
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


async def _get_task_for_user(
    session: AsyncSession,
    user: User,
    task_id: UUID,
) -> Task:
    task = await session.get(Task, task_id)
    if task is None or not (task.is_official or task.user_id == user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return task


@app.get("/tasks/{task_id}", response_model=TaskRead)
async def read_task(
    task_id: UUID,
    session: SessionDep,
    user: CurrentUserDep,
) -> Task:
    return await _get_task_for_user(session, user, task_id)


@app.patch("/tasks/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: UUID,
    payload: TaskUpdate,
    session: SessionDep,
    user: CurrentUserDep,
) -> Task:
    task = await _get_task_for_user(session, user, task_id)
    _ensure_task_editable(task, user)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        result = await session.exec(
            select(Task).where(
                Task.user_id == user.id,
                Task.category_id == task.category_id,
                Task.name == data["name"],
                Task.id != task.id,
            )
        )
        duplicate = result.first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A task with this name already exists in this category.",
            )
    if "provider" in data:
        _ensure_provider_present(data.get("provider"))
    for field, value in data.items():
        if value is None and field == "description":
            value = ""
        setattr(task, field, value)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task


@app.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    session: SessionDep,
    user: CurrentUserDep,
) -> Response:
    task = await _get_task_for_user(session, user, task_id)
    _ensure_task_editable(task, user)
    await session.delete(task)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _get_experiment_for_user(
    session: AsyncSession,
    user: User,
    experiment_id: UUID,
) -> Experiment:
    experiment = await session.get(Experiment, experiment_id)
    if experiment is None or experiment.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found",
        )
    return experiment


@app.get("/experiments", response_model=list[ExperimentRead])
async def list_experiments(
    session: SessionDep, user: CurrentUserDep
) -> list[Experiment]:
    statement = (
        select(Experiment)
        .where(Experiment.user_id == user.id)
        .order_by(
            Experiment.created_at.desc()  # pyright: ignore[reportAttributeAccessIssue]
        )
    )
    experiments = await session.exec(statement)
    return list(experiments.all())


@app.post(
    "/experiments",
    response_model=ExperimentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_experiment(
    payload: ExperimentCreate,
    session: SessionDep,
    user: CurrentUserDep,
) -> Experiment:
    result = await session.exec(
        select(Experiment).where(
            Experiment.user_id == user.id, Experiment.name == payload.name
        )
    )
    duplicate = result.first()
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An experiment with this name already exists.",
        )
    experiment = Experiment(
        name=payload.name,
        steps=payload.steps or [],
        graphical_model=payload.graphical_model or {"nodes": [], "edges": []},
        user_id=user.id,
    )
    session.add(experiment)
    await session.commit()
    await session.refresh(experiment)
    return experiment


@app.get("/experiments/{experiment_id}", response_model=ExperimentRead)
async def read_experiment(
    experiment_id: UUID,
    session: SessionDep,
    user: CurrentUserDep,
) -> Experiment:
    return await _get_experiment_for_user(session, user, experiment_id)


@app.patch("/experiments/{experiment_id}", response_model=ExperimentRead)
async def update_experiment(
    experiment_id: UUID,
    payload: ExperimentUpdate,
    session: SessionDep,
    user: CurrentUserDep,
) -> Experiment:
    experiment = await _get_experiment_for_user(session, user, experiment_id)
    _ensure_experiment_editable(experiment, user)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        result = await session.exec(
            select(Experiment).where(
                Experiment.user_id == user.id,
                Experiment.name == data["name"],
                Experiment.id != experiment.id,
            )
        )
        duplicate = result.first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An experiment with this name already exists.",
            )
    for field, value in data.items():
        if field in {"steps", "graphical_model"} and value is None:
            value = [] if field == "steps" else {"nodes": [], "edges": []}
        setattr(experiment, field, value)
    session.add(experiment)
    await session.commit()
    await session.refresh(experiment)
    return experiment


@app.delete("/experiments/{experiment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_experiment(
    experiment_id: UUID,
    session: SessionDep,
    user: CurrentUserDep,
) -> Response:
    experiment = await _get_experiment_for_user(session, user, experiment_id)
    _ensure_experiment_editable(experiment, user)
    await session.delete(experiment)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def _get_workflow_for_user(
    session: AsyncSession,
    user: User,
    workflow_id: UUID,
) -> Workflow:
    workflow = await session.get(Workflow, workflow_id)
    if workflow is None or workflow.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found",
        )
    return workflow


@app.get("/workflows", response_model=list[WorkflowRead])
async def list_workflows(session: SessionDep, user: CurrentUserDep) -> list[Workflow]:
    statement = (
        select(Workflow)
        .where(Workflow.user_id == user.id)
        .order_by(
            Workflow.created_at.desc()  # pyright: ignore[reportAttributeAccessIssue]
        )
    )
    workflows = await session.exec(statement)
    return list(workflows.all())


@app.post(
    "/workflows", response_model=WorkflowRead, status_code=status.HTTP_201_CREATED
)
async def create_workflow(
    payload: WorkflowCreate,
    session: SessionDep,
    user: CurrentUserDep,
) -> Workflow:
    result = await session.exec(
        select(Workflow).where(
            Workflow.user_id == user.id, Workflow.name == payload.name
        )
    )
    duplicate = result.first()
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A workflow with this name already exists.",
        )
    workflow = Workflow(
        name=payload.name,
        graphical_model=payload.graphical_model or {"nodes": [], "edges": []},
        user_id=user.id,
    )
    session.add(workflow)
    await session.commit()
    await session.refresh(workflow)
    return workflow


@app.get("/workflows/{workflow_id}", response_model=WorkflowRead)
async def read_workflow(
    workflow_id: UUID,
    session: SessionDep,
    user: CurrentUserDep,
) -> Workflow:
    return await _get_workflow_for_user(session, user, workflow_id)


@app.patch("/workflows/{workflow_id}", response_model=WorkflowRead)
async def update_workflow(
    workflow_id: UUID,
    payload: WorkflowUpdate,
    session: SessionDep,
    user: CurrentUserDep,
) -> Workflow:
    workflow = await _get_workflow_for_user(session, user, workflow_id)
    _ensure_workflow_editable(workflow, user)
    data = payload.model_dump(exclude_unset=True)
    if "name" in data:
        result = await session.exec(
            select(Workflow).where(
                Workflow.user_id == user.id,
                Workflow.name == data["name"],
                Workflow.id != workflow.id,
            )
        )
        duplicate = result.first()
        if duplicate:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A workflow with this name already exists.",
            )
    for field, value in data.items():
        setattr(workflow, field, value)
    session.add(workflow)
    await session.commit()
    await session.refresh(workflow)
    return workflow


@app.delete("/workflows/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: UUID,
    session: SessionDep,
    user: CurrentUserDep,
) -> Response:
    workflow = await _get_workflow_for_user(session, user, workflow_id)
    _ensure_workflow_editable(workflow, user)
    await session.delete(workflow)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def main() -> None:
    import uvicorn

    logger.info("Starting Experiment Server on http://0.0.0.0:8000")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=False,
        log_config=None,
    )


if __name__ == "__main__":
    main()
