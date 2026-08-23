"""add soulbound certificate NFT columns

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-08-14 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "credentials",
        sa.Column("sbt_token_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "credentials",
        sa.Column("sbt_tx_hash", sa.String(length=66), nullable=True),
    )
    op.add_column(
        "credentials",
        sa.Column("sbt_token_uri", sa.String(length=512), nullable=True),
    )
    op.add_column(
        "credentials",
        sa.Column("sbt_revoke_tx_hash", sa.String(length=66), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("credentials", "sbt_revoke_tx_hash")
    op.drop_column("credentials", "sbt_token_uri")
    op.drop_column("credentials", "sbt_tx_hash")
    op.drop_column("credentials", "sbt_token_id")
