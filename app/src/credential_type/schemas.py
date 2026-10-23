from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator


ALLOWED_DATA_TYPES = {
    "string",
    "number",
    "date",
    "select",
    "file",
    "boolean",
    "derived",
}

DERIVED_SOURCES = {"holder_account_role"}


class VisibleWhen(BaseModel):
    field: str
    equals: Any


class CredentialTypeField(BaseModel):
    key: str = Field(..., min_length=1, max_length=64)
    label: str = Field(..., min_length=1, max_length=128)
    data_type: Literal[
        "string", "number", "date", "select", "file", "boolean", "derived"
    ]
    required: bool = False
    options: list[str] | None = None
    visible_when: VisibleWhen | None = None
    order: int = 0
    source: str | None = None

    @field_validator("key")
    @classmethod
    def validate_key(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or not cleaned.replace("_", "").isalnum():
            raise ValueError("field key must be alphanumeric/underscore")
        return cleaned

    @model_validator(mode="after")
    def validate_field_rules(self) -> "CredentialTypeField":
        if self.data_type == "select":
            if not self.options:
                raise ValueError("select fields require non-empty options")
        elif self.options:
            raise ValueError("options are only allowed for select fields")

        if self.data_type == "derived":
            if self.source not in DERIVED_SOURCES:
                raise ValueError(
                    "derived fields require source=holder_account_role"
                )
        elif self.source:
            raise ValueError("source is only allowed for derived fields")

        return self


class CredentialTypeCreate(BaseModel):
    type_id: str = Field(..., min_length=1, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    revocable: bool = False
    fields: list[CredentialTypeField] = Field(..., min_length=1)

    @field_validator("type_id")
    @classmethod
    def validate_type_id(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned or not cleaned.replace("_", "").isalnum():
            raise ValueError("type_id must be alphanumeric/underscore")
        return cleaned

    @model_validator(mode="after")
    def validate_unique_keys(self) -> "CredentialTypeCreate":
        keys = [field.key for field in self.fields]
        if len(keys) != len(set(keys)):
            raise ValueError("field keys must be unique")
        return self


class CredentialTypeResponse(BaseModel):
    type_id: str
    display_name: str
    description: str | None = None
    revocable: bool
    fields: list[dict[str, Any]]
    schema_hash: str | None = None
    tx_hash: str | None = None
    block_number: int | None = None
    created_by: int | None = None
    created_at: str | None = None
