"""add_unique_constraint_on_username

Revision ID: 7de7dc9d79c2
Revises: aabdf4dc6e78
Create Date: 2026-02-20 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7de7dc9d79c2"
down_revision: Union[str, Sequence[str], None] = "aabdf4dc6e78"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Deduplicate users by username and enforce uniqueness."""
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                username,
                ROW_NUMBER() OVER (
                    PARTITION BY username
                    ORDER BY updated_at DESC, id DESC
                ) AS rn,
                FIRST_VALUE(id) OVER (
                    PARTITION BY username
                    ORDER BY updated_at DESC, id DESC
                ) AS keeper_id
            FROM "user"
        ),
        duplicates AS (
            SELECT id, keeper_id
            FROM ranked
            WHERE rn > 1
        )
        UPDATE experiment e
        SET user_id = d.keeper_id
        FROM duplicates d
        WHERE e.user_id = d.id;
        """
    )

    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                username,
                ROW_NUMBER() OVER (
                    PARTITION BY username
                    ORDER BY updated_at DESC, id DESC
                ) AS rn,
                FIRST_VALUE(id) OVER (
                    PARTITION BY username
                    ORDER BY updated_at DESC, id DESC
                ) AS keeper_id
            FROM "user"
        ),
        duplicates AS (
            SELECT id, keeper_id
            FROM ranked
            WHERE rn > 1
        )
        UPDATE workflow w
        SET user_id = d.keeper_id
        FROM duplicates d
        WHERE w.user_id = d.id;
        """
    )

    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                username,
                ROW_NUMBER() OVER (
                    PARTITION BY username
                    ORDER BY updated_at DESC, id DESC
                ) AS rn,
                FIRST_VALUE(id) OVER (
                    PARTITION BY username
                    ORDER BY updated_at DESC, id DESC
                ) AS keeper_id
            FROM "user"
        ),
        duplicates AS (
            SELECT id, keeper_id
            FROM ranked
            WHERE rn > 1
        )
        UPDATE task t
        SET user_id = d.keeper_id
        FROM duplicates d
        WHERE t.user_id = d.id;
        """
    )

    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                username,
                ROW_NUMBER() OVER (
                    PARTITION BY username
                    ORDER BY updated_at DESC, id DESC
                ) AS rn,
                FIRST_VALUE(id) OVER (
                    PARTITION BY username
                    ORDER BY updated_at DESC, id DESC
                ) AS keeper_id
            FROM "user"
        ),
        duplicates AS (
            SELECT id, keeper_id
            FROM ranked
            WHERE rn > 1
        )
        UPDATE category c
        SET user_id = d.keeper_id
        FROM duplicates d
        WHERE c.user_id = d.id;
        """
    )

    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                username,
                ROW_NUMBER() OVER (
                    PARTITION BY username
                    ORDER BY updated_at DESC, id DESC
                ) AS rn
            FROM "user"
        ),
        duplicates AS (
            SELECT id
            FROM ranked
            WHERE rn > 1
        )
        DELETE FROM "user" u
        USING duplicates d
        WHERE u.id = d.id;
        """
    )

    op.create_unique_constraint("uq_user_username", "user", ["username"])


def downgrade() -> None:
    """Drop username uniqueness constraint."""
    op.drop_constraint("uq_user_username", "user", type_="unique")
