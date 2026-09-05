"""add super_admin to user_role_enum

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            ALTER TYPE user_role_enum ADD VALUE 'super_admin';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END
        $$;
        """
    )


def downgrade() -> None:
    # PostgreSQL cannot easily remove enum values; leave as no-op.
    pass
