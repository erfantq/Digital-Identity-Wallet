"""add credential_types and drop dids.active

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-13 20:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SEED_TYPES = [
    {
        "type_id": "UniversityPIDCredential",
        "display_name": "University PID",
        "description": "Personal identity credential for a university member.",
        "revocable": False,
        "fields": [
            {
                "key": "firstName",
                "label": "First name",
                "data_type": "string",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 1,
            },
            {
                "key": "lastName",
                "label": "Last name",
                "data_type": "string",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 2,
            },
            {
                "key": "nationalId",
                "label": "National ID",
                "data_type": "string",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 3,
            },
            {
                "key": "university",
                "label": "University",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 4,
            },
            {
                "key": "faculty",
                "label": "Faculty",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 5,
            },
            {
                "key": "department",
                "label": "Department",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 6,
            },
            {
                "key": "role",
                "label": "Member role",
                "data_type": "derived",
                "source": "holder_account_role",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 7,
            },
        ],
    },
    {
        "type_id": "UniversityEnrollmentCredential",
        "display_name": "Enrollment",
        "description": "Active enrollment or employment status at the university.",
        "revocable": True,
        "fields": [
            {
                "key": "firstName",
                "label": "First name",
                "data_type": "string",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 1,
            },
            {
                "key": "lastName",
                "label": "Last name",
                "data_type": "string",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 2,
            },
            {
                "key": "nationalId",
                "label": "National ID",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 3,
            },
            {
                "key": "university",
                "label": "University",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 4,
            },
            {
                "key": "faculty",
                "label": "Faculty",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 5,
            },
            {
                "key": "department",
                "label": "Department",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 6,
            },
            {
                "key": "role",
                "label": "Member role",
                "data_type": "derived",
                "source": "holder_account_role",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 7,
            },
            {
                "key": "degreeLevel",
                "label": "Degree level",
                "data_type": "select",
                "required": False,
                "options": ["Bachelor", "Master", "PhD"],
                "visible_when": {"field": "role", "equals": "Student"},
                "order": 8,
            },
            {
                "key": "enrollmentYear",
                "label": "Enrollment year",
                "data_type": "number",
                "required": False,
                "options": None,
                "visible_when": {"field": "role", "equals": "Student"},
                "order": 9,
            },
            {
                "key": "currentTerm",
                "label": "Current term",
                "data_type": "number",
                "required": False,
                "options": None,
                "visible_when": {"field": "role", "equals": "Student"},
                "order": 10,
            },
            {
                "key": "academicRank",
                "label": "Academic rank",
                "data_type": "select",
                "required": False,
                "options": [
                    "Instructor",
                    "Lecturer",
                    "Assistant Professor",
                    "Associate Professor",
                    "Professor",
                ],
                "visible_when": {"field": "role", "equals": "Teacher"},
                "order": 11,
            },
            {
                "key": "employmentYear",
                "label": "Employment year",
                "data_type": "number",
                "required": False,
                "options": None,
                "visible_when": {"field": "role", "equals": "Teacher"},
                "order": 12,
            },
        ],
    },
    {
        "type_id": "UniversityCertificateCredential",
        "display_name": "Degree Certificate",
        "description": "Completed degree or graduation certificate.",
        "revocable": False,
        "fields": [
            {
                "key": "firstName",
                "label": "First name",
                "data_type": "string",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 1,
            },
            {
                "key": "lastName",
                "label": "Last name",
                "data_type": "string",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 2,
            },
            {
                "key": "nationalId",
                "label": "National ID",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 3,
            },
            {
                "key": "university",
                "label": "University",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 4,
            },
            {
                "key": "faculty",
                "label": "Faculty",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 5,
            },
            {
                "key": "department",
                "label": "Department",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 6,
            },
            {
                "key": "programName",
                "label": "Program name",
                "data_type": "string",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 7,
            },
            {
                "key": "degreeLevel",
                "label": "Degree level",
                "data_type": "select",
                "required": True,
                "options": ["Bachelor", "Master", "PhD"],
                "visible_when": None,
                "order": 8,
            },
            {
                "key": "graduationDate",
                "label": "Graduation date",
                "data_type": "date",
                "required": True,
                "options": None,
                "visible_when": None,
                "order": 9,
            },
            {
                "key": "honors",
                "label": "Honors",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 10,
            },
            {
                "key": "gpa",
                "label": "GPA",
                "data_type": "string",
                "required": False,
                "options": None,
                "visible_when": None,
                "order": 11,
            },
        ],
    },
]


def upgrade() -> None:
    op.create_table(
        "credential_types",
        sa.Column("type_id", sa.String(length=128), primary_key=True),
        sa.Column("display_name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("revocable", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column(
            "fields",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("schema_hash", sa.String(length=66), nullable=True),
        sa.Column("tx_hash", sa.String(length=66), nullable=True),
        sa.Column("block_number", sa.Integer(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    credential_types = sa.table(
        "credential_types",
        sa.column("type_id", sa.String),
        sa.column("display_name", sa.String),
        sa.column("description", sa.Text),
        sa.column("revocable", sa.Boolean),
        sa.column("fields", postgresql.JSONB),
        sa.column("created_by", sa.Integer),
    )

    for item in SEED_TYPES:
        op.execute(
            credential_types.insert().values(
                type_id=item["type_id"],
                display_name=item["display_name"],
                description=item["description"],
                revocable=item["revocable"],
                fields=item["fields"],
                created_by=None,
            )
        )

    op.drop_column("dids", "active")


def downgrade() -> None:
    op.add_column(
        "dids",
        sa.Column("active", sa.Boolean(), server_default=sa.true(), nullable=True),
    )
    op.drop_table("credential_types")
