"""add_notify_trigger

Revision ID: f49d4895c6e2
Revises: 359811453a0c
Create Date: 2025-11-21 13:26:35.328641

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f49d4895c6e2"
down_revision: Union[str, Sequence[str], None] = "359811453a0c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        CREATE OR REPLACE FUNCTION notify_event() RETURNS TRIGGER AS $$
        DECLARE
            payload JSON;
            record_data RECORD;
        BEGIN
            IF (TG_OP = 'DELETE') THEN
                record_data = OLD;
            ELSE
                record_data = NEW;
            END IF;

            payload = json_build_object(
                'table', TG_TABLE_NAME,
                'action', TG_OP,
                'id', record_data.id,
                'user_id', record_data.user_id
            );
            PERFORM pg_notify('db_events', payload::text);
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
    """
    )

    tables = ["experiment", "task", "workflow", "category"]
    for table in tables:
        op.execute(
            f"""
            CREATE TRIGGER notify_{table}_changes
            AFTER INSERT OR UPDATE OR DELETE ON {table}
            FOR EACH ROW EXECUTE FUNCTION notify_event();
        """
        )


def downgrade() -> None:
    tables = ["experiment", "task", "workflow", "category"]
    for table in tables:
        op.execute(f"DROP TRIGGER IF EXISTS notify_{table}_changes ON {table};")
    op.execute("DROP FUNCTION IF EXISTS notify_event();")
