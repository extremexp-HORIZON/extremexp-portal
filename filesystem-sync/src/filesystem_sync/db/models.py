"""
SQLModel models for database entities.

These models are compatible with the portal-server schema.
Only includes models needed for filesystem-sync (User, Experiment, Workflow).
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Column, DateTime, Index, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlmodel import Field, SQLModel
from uuid6 import uuid7


def utcnow() -> datetime:
    """Return a timezone-aware UTC timestamp suitable for default factories."""
    return datetime.now(UTC)


class Timestamped(SQLModel, table=False):
    """Base class providing created_at and updated_at timestamps."""

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
    """User model - represents a workspace user."""

    __table_args__ = (
        UniqueConstraint(
            "username",
            name="uq_user_username",
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
    username: str = Field(
        min_length=1,
        max_length=255,
    )
    display_name: str | None = Field(
        default=None,
    )


class Experiment(Timestamped, table=True):
    """Experiment model - synced to .xxp files in experiments/ folder."""

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


class Workflow(Timestamped, table=True):
    """Workflow model - synced to .xxp files in workflows/ folder."""

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


# Define indexes (matching portal-server schema)
Index(
    "ix_experiment_user_updated_at",
    Experiment.user_id,  # type: ignore[arg-type]
    Experiment.updated_at.desc(),  # type: ignore[attr-defined]
)
Index(
    "ix_workflow_user_updated_at",
    Workflow.user_id,  # type: ignore[arg-type]
    Workflow.updated_at.desc(),  # type: ignore[attr-defined]
)
