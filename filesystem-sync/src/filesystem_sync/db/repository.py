"""
Repository for CRUD operations on database models.

Provides async methods for managing Users, Experiments, and Workflows.
"""

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Experiment, User, Workflow

logger = structlog.get_logger(__name__)


class Repository:
    """
    Repository for database operations.

    All methods require an async session to be passed in.
    """

    # --- User operations ---

    @staticmethod
    async def get_user_by_username(session: AsyncSession, username: str) -> User | None:
        """Get a user by username."""
        result = await session.execute(
            select(User).where(User.username == username)  # pyright: ignore[reportArgumentType]
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_user_by_id(session: AsyncSession, user_id: UUID) -> User | None:
        """Get a user by ID."""
        result = await session.execute(
            select(User).where(User.id == user_id)  # pyright: ignore[reportArgumentType]
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_or_create_user(session: AsyncSession, username: str) -> User:
        """Get an existing user or create a new one."""
        user = await Repository.get_user_by_username(session, username)
        if user is None:
            user = User(username=username)
            session.add(user)
            await session.flush()
            logger.info("Created new user", username=username, user_id=str(user.id))
        return user

    @staticmethod
    async def list_users(session: AsyncSession) -> list[User]:
        """List all users."""
        result = await session.execute(select(User))
        return list(result.scalars().all())

    # --- Experiment operations ---

    @staticmethod
    async def get_experiment_by_name(
        session: AsyncSession, user_id: UUID, name: str
    ) -> Experiment | None:
        """Get an experiment by user ID and name."""
        result = await session.execute(
            select(Experiment).where(
                Experiment.user_id == user_id,  # pyright: ignore[reportArgumentType]
                Experiment.name == name,  # pyright: ignore[reportArgumentType]
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_experiment_by_id(session: AsyncSession, experiment_id: UUID) -> Experiment | None:
        """Get an experiment by ID."""
        result = await session.execute(
            select(Experiment).where(Experiment.id == experiment_id)  # pyright: ignore[reportArgumentType]
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_experiments_for_user(session: AsyncSession, user_id: UUID) -> list[Experiment]:
        """List all experiments for a user."""
        result = await session.execute(
            select(Experiment)
            .where(Experiment.user_id == user_id)  # pyright: ignore[reportArgumentType]
            .order_by(Experiment.updated_at.desc())  # pyright: ignore[reportAttributeAccessIssue]
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_experiment(
        session: AsyncSession,
        user_id: UUID,
        name: str,
        steps: list[dict[str, Any]] | None = None,
        graphical_model: dict[str, Any] | None = None,
    ) -> Experiment:
        """Create a new experiment."""
        experiment = Experiment(
            user_id=user_id,
            name=name,
            steps=steps or [],
            graphical_model=graphical_model or {"nodes": [], "edges": []},
        )
        session.add(experiment)
        await session.flush()
        logger.info(
            "Created experiment",
            experiment_id=str(experiment.id),
            name=name,
            user_id=str(user_id),
        )
        return experiment

    @staticmethod
    async def update_experiment(
        session: AsyncSession,
        experiment: Experiment,
        steps: list[dict[str, Any]] | None = None,
        graphical_model: dict[str, Any] | None = None,
        name: str | None = None,
    ) -> Experiment:
        """Update an existing experiment."""
        if steps is not None:
            experiment.steps = steps
        if graphical_model is not None:
            experiment.graphical_model = graphical_model
        if name is not None:
            experiment.name = name
        session.add(experiment)
        await session.flush()
        logger.info(
            "Updated experiment",
            experiment_id=str(experiment.id),
            name=experiment.name,
        )
        return experiment

    @staticmethod
    async def upsert_experiment(
        session: AsyncSession,
        user_id: UUID,
        name: str,
        steps: list[dict[str, Any]] | None = None,
        graphical_model: dict[str, Any] | None = None,
    ) -> Experiment:
        """Create or update an experiment."""
        experiment = await Repository.get_experiment_by_name(session, user_id, name)
        if experiment is None:
            return await Repository.create_experiment(
                session, user_id, name, steps, graphical_model
            )
        return await Repository.update_experiment(session, experiment, steps, graphical_model)

    @staticmethod
    async def delete_experiment(session: AsyncSession, experiment: Experiment) -> None:
        """Delete an experiment."""
        logger.info(
            "Deleting experiment",
            experiment_id=str(experiment.id),
            name=experiment.name,
        )
        await session.delete(experiment)
        await session.flush()

    @staticmethod
    async def delete_experiment_by_name(session: AsyncSession, user_id: UUID, name: str) -> bool:
        """Delete an experiment by name. Returns True if deleted, False if not found."""
        experiment = await Repository.get_experiment_by_name(session, user_id, name)
        if experiment is None:
            return False
        await Repository.delete_experiment(session, experiment)
        return True

    # --- Workflow operations ---

    @staticmethod
    async def get_workflow_by_name(
        session: AsyncSession, user_id: UUID, name: str
    ) -> Workflow | None:
        """Get a workflow by user ID and name."""
        result = await session.execute(
            select(Workflow).where(
                Workflow.user_id == user_id,  # pyright: ignore[reportArgumentType]
                Workflow.name == name,  # pyright: ignore[reportArgumentType]
            )
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def get_workflow_by_id(session: AsyncSession, workflow_id: UUID) -> Workflow | None:
        """Get a workflow by ID."""
        result = await session.execute(
            select(Workflow).where(Workflow.id == workflow_id)  # pyright: ignore[reportArgumentType]
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def list_workflows_for_user(session: AsyncSession, user_id: UUID) -> list[Workflow]:
        """List all workflows for a user."""
        result = await session.execute(
            select(Workflow)
            .where(Workflow.user_id == user_id)  # pyright: ignore[reportArgumentType]
            .order_by(Workflow.updated_at.desc())  # pyright: ignore[reportAttributeAccessIssue]
        )
        return list(result.scalars().all())

    @staticmethod
    async def create_workflow(
        session: AsyncSession,
        user_id: UUID,
        name: str,
        graphical_model: dict[str, Any] | None = None,
    ) -> Workflow:
        """Create a new workflow."""
        workflow = Workflow(
            user_id=user_id,
            name=name,
            graphical_model=graphical_model or {"nodes": [], "edges": []},
        )
        session.add(workflow)
        await session.flush()
        logger.info(
            "Created workflow",
            workflow_id=str(workflow.id),
            name=name,
            user_id=str(user_id),
        )
        return workflow

    @staticmethod
    async def update_workflow(
        session: AsyncSession,
        workflow: Workflow,
        graphical_model: dict[str, Any] | None = None,
        name: str | None = None,
    ) -> Workflow:
        """Update an existing workflow."""
        if graphical_model is not None:
            workflow.graphical_model = graphical_model
        if name is not None:
            workflow.name = name
        session.add(workflow)
        await session.flush()
        logger.info(
            "Updated workflow",
            workflow_id=str(workflow.id),
            name=workflow.name,
        )
        return workflow

    @staticmethod
    async def upsert_workflow(
        session: AsyncSession,
        user_id: UUID,
        name: str,
        graphical_model: dict[str, Any] | None = None,
    ) -> Workflow:
        """Create or update a workflow."""
        workflow = await Repository.get_workflow_by_name(session, user_id, name)
        if workflow is None:
            return await Repository.create_workflow(session, user_id, name, graphical_model)
        return await Repository.update_workflow(session, workflow, graphical_model)

    @staticmethod
    async def delete_workflow(session: AsyncSession, workflow: Workflow) -> None:
        """Delete a workflow."""
        logger.info(
            "Deleting workflow",
            workflow_id=str(workflow.id),
            name=workflow.name,
        )
        await session.delete(workflow)
        await session.flush()

    @staticmethod
    async def delete_workflow_by_name(session: AsyncSession, user_id: UUID, name: str) -> bool:
        """Delete a workflow by name. Returns True if deleted, False if not found."""
        workflow = await Repository.get_workflow_by_name(session, user_id, name)
        if workflow is None:
            return False
        await Repository.delete_workflow(session, workflow)
        return True

    # --- Generic operations ---

    @staticmethod
    async def get_entity_by_id(
        session: AsyncSession,
        entity_type: Literal["experiment", "workflow"],
        entity_id: UUID,
    ) -> Experiment | Workflow | None:
        """Get an entity by type and ID."""
        if entity_type == "experiment":
            return await Repository.get_experiment_by_id(session, entity_id)
        elif entity_type == "workflow":
            return await Repository.get_workflow_by_id(session, entity_id)
        return None
