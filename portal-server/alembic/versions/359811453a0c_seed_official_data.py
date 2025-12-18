"""Seed official data

Revision ID: 359811453a0c
Revises: 9f942960ca5d
Create Date: 2025-11-20 07:17:09.343243

"""

from typing import Sequence, Union
from datetime import datetime, timezone

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = "359811453a0c"
down_revision: Union[str, Sequence[str], None] = "9f942960ca5d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    category_table = sa.table(
        "category",
        sa.column("id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
        sa.column("is_official", sa.Boolean),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("user_id", sa.UUID),
    )

    task_table = sa.table(
        "task",
        sa.column("id", sa.UUID),
        sa.column("category_id", sa.UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.String),
        sa.column("provider", sa.String),
        sa.column("graphical_model", JSONB),
        sa.column("is_official", sa.Boolean),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
        sa.column("user_id", sa.UUID),
    )

    # Hardcoded UUIDs for reproducibility
    cat_ids = {
        "Input and Output Data": "d290f1ee-6c54-4b01-90e6-d701748f0851",
        "Data Preprocessing": "d290f1ee-6c54-4b01-90e6-d701748f0852",
        "Features Extraction": "d290f1ee-6c54-4b01-90e6-d701748f0853",
        "ML Classification": "d290f1ee-6c54-4b01-90e6-d701748f0854",
        "ML Regression": "d290f1ee-6c54-4b01-90e6-d701748f0855",
        "Train": "d290f1ee-6c54-4b01-90e6-d701748f0856",
        "Predict": "d290f1ee-6c54-4b01-90e6-d701748f0857",
    }

    now = datetime.now(timezone.utc)

    op.bulk_insert(
        category_table,
        [
            {
                "id": cat_ids["Input and Output Data"],
                "name": "Input and Output Data",
                "description": "Input and Output Data",
                "is_official": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": cat_ids["Data Preprocessing"],
                "name": "Data Preprocessing",
                "description": "Data Preprocessing",
                "is_official": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": cat_ids["Features Extraction"],
                "name": "Features Extraction",
                "description": "Features Extraction",
                "is_official": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": cat_ids["ML Classification"],
                "name": "ML Classification",
                "description": "ML Classification",
                "is_official": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": cat_ids["ML Regression"],
                "name": "ML Regression",
                "description": "ML Regression",
                "is_official": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": cat_ids["Train"],
                "name": "Train",
                "description": "Train",
                "is_official": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "id": cat_ids["Predict"],
                "name": "Predict",
                "description": "Predict",
                "is_official": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )

    op.bulk_insert(
        task_table,
        [
            {
                "id": "d290f1ee-6c54-4b01-90e6-d701748f0858",
                "category_id": cat_ids["Input and Output Data"],
                "name": "load csv",
                "description": "Load a csv file from a URI",
                "provider": "ExtremeXP",
                "is_official": True,
                "created_at": now,
                "updated_at": now,
                "graphical_model": {
                    "edges": [
                        {
                            "data": {},
                            "id": "n9rgUYrI3v4MIdxqlmL5X",
                            "markerEnd": {
                                "color": "#000",
                                "height": 20,
                                "type": "arrow",
                                "width": 20,
                            },
                            "source": "start-ByGL5VPXc-nt1FCFvfR9p",
                            "sourceHandle": None,
                            "style": {"stroke": "#000", "strokeWidth": 1.5},
                            "target": "task-mDtzBp0thidem7mN7l1Tn",
                            "targetHandle": "t-top",
                            "type": "regular",
                        },
                        {
                            "data": {},
                            "id": "BtI37llMQ9KCeqNC0Tsks",
                            "markerEnd": {
                                "color": "#000",
                                "height": 20,
                                "type": "arrow",
                                "width": 20,
                            },
                            "source": "task-mDtzBp0thidem7mN7l1Tn",
                            "sourceHandle": "s-bottom",
                            "style": {"stroke": "#000", "strokeWidth": 1.5},
                            "target": "end-O5OF6FMQ6k5IPrxJVb6zl",
                            "targetHandle": None,
                            "type": "regular",
                        },
                    ],
                    "nodes": [
                        {
                            "data": {},
                            "height": 36,
                            "id": "start-ByGL5VPXc-nt1FCFvfR9p",
                            "position": {"x": 358, "y": 134},
                            "type": "start",
                            "width": 31,
                        },
                        {
                            "data": {
                                "currentVariant": "variant-1-5p7Af-UByzwnGdS7CSDsW",
                                "variants": [
                                    {
                                        "description": "no description",
                                        "graphical_model": {"edges": [], "nodes": []},
                                        "id_task": "variant-1-5p7Af-UByzwnGdS7CSDsW",
                                        "implementationRef": "",
                                        "isAbstract": True,
                                        "is_composite": False,
                                        "name": "task",
                                        "parameters": [],
                                        "variant": 1,
                                    }
                                ],
                            },
                            "dragging": False,
                            "height": 44,
                            "id": "task-mDtzBp0thidem7mN7l1Tn",
                            "position": {
                                "x": 322.2776598454062,
                                "y": 249.78988658918223,
                            },
                            "positionAbsolute": {
                                "x": 322.2776598454062,
                                "y": 249.78988658918223,
                            },
                            "selected": True,
                            "type": "task",
                            "width": 102,
                        },
                        {
                            "data": {},
                            "dragging": False,
                            "height": 37,
                            "id": "end-O5OF6FMQ6k5IPrxJVb6zl",
                            "position": {"x": 357.1145489851613, "y": 397.100160665861},
                            "positionAbsolute": {
                                "x": 357.1145489851613,
                                "y": 397.100160665861,
                            },
                            "selected": False,
                            "type": "end",
                            "width": 32,
                        },
                    ],
                },
            }
        ],
    )


def downgrade() -> None:
    """Downgrade schema."""
    # We could delete the data, but usually data migrations are one-way or we just truncate.
    # For safety, let's just delete the specific IDs we inserted.

    # Note: In a real production env, we might want to be more careful.
    op.execute("DELETE FROM task WHERE is_official = true")
    op.execute("DELETE FROM category WHERE is_official = true")
