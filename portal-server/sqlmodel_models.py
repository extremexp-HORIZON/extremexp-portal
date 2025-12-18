from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from uuid6 import uuid7
from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Index,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import relationship
from sqlmodel import Field, Relationship, SQLModel


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp suitable for default factories."""
    return datetime.now(timezone.utc)


class Timestamped(SQLModel, table=False):
    created_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "nullable": False,
            "server_default": func.now(),
        },
    )
    updated_at: datetime = Field(
        default_factory=utcnow,
        sa_type=DateTime(timezone=True),
        sa_column_kwargs={
            "nullable": False,
            "server_default": func.now(),
            "onupdate": func.now(),
        },
    )


class User(Timestamped, table=True):
    id: UUID = Field(
        default_factory=uuid7,
        sa_column=Column(
            PGUUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=text("gen_random_uuid()"),
        ),
    )
    username: str = Field(
        min_length=1,
        max_length=255,
    )
    display_name: str | None = Field(
        default=None,
    )

    categories: list["Category"] = Relationship(
        sa_relationship=relationship("Category", back_populates="user")
    )
    tasks: list["Task"] = Relationship(
        sa_relationship=relationship("Task", back_populates="user")
    )
    experiments: list["Experiment"] = Relationship(
        sa_relationship=relationship("Experiment", back_populates="user")
    )
    workflows: list["Workflow"] = Relationship(
        sa_relationship=relationship("Workflow", back_populates="user")
    )


class Category(Timestamped, table=True):
    __table_args__ = (
        CheckConstraint(
            "NOT is_official OR user_id IS NULL",
            name="ck_category_official_without_user",
        ),
    )

    id: UUID = Field(
        default_factory=uuid7,
        sa_column=Column(
            PGUUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=text("gen_random_uuid()"),
        ),
    )
    user_id: UUID | None = Field(
        default=None,
        foreign_key="user.id",
    )
    name: str = Field(
        min_length=1,
        max_length=120,
    )
    description: str = Field(
        default="",
    )
    is_official: bool = Field(
        default=False,
    )

    user: User | None = Relationship(
        sa_relationship=relationship("User", back_populates="categories")
    )
    tasks: list["Task"] = Relationship(
        sa_relationship=relationship("Task", back_populates="category")
    )


class Task(Timestamped, table=True):
    __table_args__ = (
        CheckConstraint(
            "NOT is_official OR user_id IS NULL",
            name="ck_task_official_without_user",
        ),
        CheckConstraint(
            "user_id IS NULL OR provider IS NOT NULL",
            name="ck_task_provider_when_user_defined",
        ),
    )

    id: UUID = Field(
        default_factory=uuid7,
        sa_column=Column(
            PGUUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=text("gen_random_uuid()"),
        ),
    )
    category_id: UUID = Field(
        foreign_key="category.id",
    )
    user_id: UUID | None = Field(
        default=None,
        foreign_key="user.id",
    )
    name: str = Field(
        min_length=1,
        max_length=120,
    )
    provider: str | None = Field(
        default=None,
    )
    description: str = Field(
        default="",
    )
    graphical_model: dict[str, Any] = Field(
        default_factory=lambda: {"nodes": [], "edges": []},
        sa_column=Column(
            JSONB,
            nullable=False,
            server_default=text('\'{"nodes": [], "edges": []}\'::jsonb'),
        ),
    )
    is_official: bool = Field(
        default=False,
    )

    user: User | None = Relationship(
        sa_relationship=relationship("User", back_populates="tasks")
    )
    category: Category = Relationship(
        sa_relationship=relationship("Category", back_populates="tasks")
    )


class Experiment(Timestamped, table=True):
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "name",
            name="uq_experiment_user_name",
        ),
    )

    id: UUID = Field(
        default_factory=uuid7,
        sa_column=Column(
            PGUUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=text("gen_random_uuid()"),
        ),
    )
    user_id: UUID = Field(
        foreign_key="user.id",
    )
    name: str = Field(
        min_length=1,
        max_length=120,
    )
    steps: list[dict[str, Any]] = Field(
        default_factory=list,
        sa_column=Column(
            JSONB,
            nullable=False,
            server_default=text("'[]'::jsonb"),
        ),
    )
    graphical_model: dict[str, Any] = Field(
        default_factory=lambda: {"nodes": [], "edges": []},
        sa_column=Column(
            JSONB,
            nullable=False,
            server_default=text('\'{"nodes": [], "edges": []}\'::jsonb'),
        ),
    )

    user: User = Relationship(
        sa_relationship=relationship("User", back_populates="experiments")
    )


class Workflow(Timestamped, table=True):
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "name",
            name="uq_workflow_user_name",
        ),
    )

    id: UUID = Field(
        default_factory=uuid7,
        sa_column=Column(
            PGUUID(as_uuid=True),
            primary_key=True,
            nullable=False,
            server_default=text("gen_random_uuid()"),
        ),
    )
    user_id: UUID = Field(
        foreign_key="user.id",
    )
    name: str = Field(
        min_length=1,
        max_length=120,
    )
    graphical_model: dict[str, Any] = Field(
        default_factory=lambda: {"nodes": [], "edges": []},
        sa_column=Column(
            JSONB,
            nullable=False,
            server_default=text('\'{"nodes": [], "edges": []}\'::jsonb'),
        ),
    )

    user: User = Relationship(
        sa_relationship=relationship("User", back_populates="workflows")
    )


Index(
    "ix_category_user_name_unique",
    Category.name,
    unique=True,
)
Index(
    "ix_category_official_name_unique",
    Category.name,
    unique=True,
    postgresql_where=Category.user_id.is_(  # pyright: ignore[reportAttributeAccessIssue,reportOptionalMemberAccess]
        None
    ),
)
Index(
    "ix_category_is_official",
    Category.is_official,  # pyright: ignore[reportArgumentType]
)
Index(
    "ix_category_updated_at",
    Category.updated_at.desc(),  # pyright: ignore[reportAttributeAccessIssue]
)

Index(
    "ix_task_user_category_name_unique",
    Task.category_id,  # pyright: ignore[reportArgumentType]
    Task.user_id,  # pyright: ignore[reportArgumentType]
    Task.name,
    unique=True,
    postgresql_where=Task.user_id.isnot(  # pyright: ignore[reportAttributeAccessIssue,reportOptionalMemberAccess]
        None
    ),
)
Index(
    "ix_task_official_category_name_unique",
    Task.category_id,  # pyright: ignore[reportArgumentType]
    Task.name,
    unique=True,
    postgresql_where=Task.user_id.is_(  # pyright: ignore[reportAttributeAccessIssue,reportOptionalMemberAccess]
        None
    ),
)
Index(
    "ix_task_category_user",
    Task.category_id,  # pyright: ignore[reportArgumentType]
    Task.user_id,  # pyright: ignore[reportArgumentType]
)
Index(
    "ix_task_updated_at",
    Task.updated_at.desc(),  # pyright: ignore[reportAttributeAccessIssue]
)

Index(
    "ix_experiment_user_updated_at",
    Experiment.user_id,  # pyright: ignore[reportArgumentType]
    Experiment.updated_at.desc(),  # pyright: ignore[reportAttributeAccessIssue]
)
Index(
    "ix_workflow_user_updated_at",
    Workflow.user_id,  # pyright: ignore[reportArgumentType]
    Workflow.updated_at.desc(),  # pyright: ignore[reportAttributeAccessIssue]
)
