"""normalize legacy credential type values

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-12 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Map pre-validation defaults / W3C base type onto University PID.
    op.execute(
        """
        UPDATE credentials
        SET type = 'UniversityPIDCredential'
        WHERE type IS NULL
           OR btrim(type) = ''
           OR type IN ('UniversityCredential', 'VerifiableCredential')
        """
    )


def downgrade() -> None:
    # Irreversible data normalization.
    pass
