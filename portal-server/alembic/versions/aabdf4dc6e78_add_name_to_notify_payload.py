"""add_name_to_notify_payload

Revision ID: aabdf4dc6e78
Revises: f49d4895c6e2
Create Date: 2025-12-18 19:53:11.585031

This migration updates the notify_event() trigger function to include
the entity 'name' field in the payload. This is backward compatible
because consumers that don't expect the 'name' field will simply ignore it.

The 'name' field is particularly important for DELETE events, as the
entity no longer exists in the database when the notification is received.
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "aabdf4dc6e78"
down_revision: Union[str, Sequence[str], None] = "f49d4895c6e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Upgrade the notify_event() function to include 'name' in the payload.

    The updated payload will be:
    {
        "table": "<table_name>",
        "action": "INSERT|UPDATE|DELETE",
        "id": "<uuid>",
        "user_id": "<uuid>",
        "name": "<entity_name>"  -- NEW: included for all events
    }

    This is backward compatible with existing consumers.
    """
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
                'user_id', record_data.user_id,
                'name', record_data.name
            );
            PERFORM pg_notify('db_events', payload::text);
            RETURN NULL;
        END;
        $$ LANGUAGE plpgsql;
        """
    )


def downgrade() -> None:
    """
    Downgrade to the original notify_event() function without 'name'.
    """
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
