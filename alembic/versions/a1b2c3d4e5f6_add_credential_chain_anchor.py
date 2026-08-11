"""add credential on-chain anchor columns

Revision ID: a1b2c3d4e5f6
Revises: ecd54d347fc9
Create Date: 2026-08-11 12:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "ecd54d347fc9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "credentials",
        sa.Column("credential_hash", sa.String(length=66), nullable=True),
    )
    op.add_column(
        "credentials",
        sa.Column("tx_hash", sa.String(length=66), nullable=True),
    )
    op.add_column(
        "credentials",
        sa.Column("block_number", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("credentials", "block_number")
    op.drop_column("credentials", "tx_hash")
    op.drop_column("credentials", "credential_hash")
