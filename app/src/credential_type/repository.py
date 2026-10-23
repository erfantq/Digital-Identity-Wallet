from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session
from web3 import Web3

from .models import CredentialType


def canonical_fields_json(fields: list[dict[str, Any]] | list[Any]) -> str:
    """Stable JSON used for schema_hash (DB + on-chain)."""
    normalized: list[dict[str, Any]] = []
    for item in fields:
        if hasattr(item, "model_dump"):
            data = item.model_dump(mode="json")
        else:
            data = dict(item)
        normalized.append(
            {
                "key": data["key"],
                "label": data["label"],
                "data_type": data["data_type"],
                "required": bool(data.get("required", False)),
                "options": data.get("options"),
                "visible_when": data.get("visible_when"),
                "order": int(data.get("order") or 0),
                "source": data.get("source"),
            }
        )
    normalized.sort(key=lambda row: (row["order"], row["key"]))
    return json.dumps(normalized, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def schema_hash_for_fields(fields: list[dict[str, Any]] | list[Any]) -> str:
    return Web3.to_hex(Web3.keccak(text=canonical_fields_json(fields)))


def type_id_hash(type_id: str) -> bytes:
    return Web3.keccak(text=type_id)


def get_credential_type(db: Session, type_id: str) -> CredentialType | None:
    return (
        db.query(CredentialType)
        .filter(CredentialType.type_id == type_id)
        .first()
    )


def list_credential_types(db: Session) -> list[CredentialType]:
    return (
        db.query(CredentialType)
        .order_by(CredentialType.display_name.asc(), CredentialType.type_id.asc())
        .all()
    )


def create_credential_type(
    db: Session,
    *,
    type_id: str,
    display_name: str,
    description: str | None,
    revocable: bool,
    fields: list[dict[str, Any]],
    schema_hash: str,
    created_by: int | None,
    tx_hash: str | None = None,
    block_number: int | None = None,
) -> CredentialType:
    record = CredentialType(
        type_id=type_id,
        display_name=display_name,
        description=description,
        revocable=revocable,
        fields=fields,
        schema_hash=schema_hash,
        created_by=created_by,
        tx_hash=tx_hash,
        block_number=block_number,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_credential_type_chain_anchor(
    db: Session,
    type_id: str,
    *,
    schema_hash: str,
    tx_hash: str,
    block_number: int,
) -> CredentialType | None:
    record = get_credential_type(db, type_id)
    if not record:
        return None
    record.schema_hash = schema_hash
    record.tx_hash = tx_hash
    record.block_number = block_number
    db.commit()
    db.refresh(record)
    return record


def serialize_credential_type(record: CredentialType) -> dict[str, Any]:
    return {
        "type_id": record.type_id,
        "display_name": record.display_name,
        "description": record.description,
        "revocable": bool(record.revocable),
        "fields": record.fields or [],
        "schema_hash": record.schema_hash,
        "tx_hash": record.tx_hash,
        "block_number": record.block_number,
        "created_by": record.created_by,
        "created_at": record.created_at.isoformat() if record.created_at else None,
    }


def _is_field_visible(field: dict[str, Any], data: dict[str, Any]) -> bool:
    visible_when = field.get("visible_when")
    if not visible_when:
        return True
    target = visible_when.get("field")
    expected = visible_when.get("equals")
    return data.get(target) == expected


def validate_credential_data_against_template(
    fields: list[dict[str, Any]],
    credential_data: dict[str, Any],
    *,
    holder_account_role: str | None = None,
) -> dict[str, Any]:
    """
    Validate and normalize credential_data against a template.
    Returns the cleaned subject payload (without id/username).
    """
    data = dict(credential_data or {})
    cleaned: dict[str, Any] = {}
    errors: list[str] = []

    for field in sorted(fields or [], key=lambda item: int(item.get("order") or 0)):
        key = field["key"]
        data_type = field.get("data_type")
        required = bool(field.get("required"))

        if data_type == "derived":
            source = field.get("source")
            if source == "holder_account_role":
                role = (holder_account_role or "").strip()
                if role.lower() == "student":
                    value = "Student"
                elif role.lower() == "teacher":
                    value = "Teacher"
                else:
                    value = None
                if required and not value:
                    errors.append(
                        f"Field '{key}' requires holder account role student/teacher"
                    )
                elif value:
                    cleaned[key] = value
                    data[key] = value
            continue

        if not _is_field_visible(field, {**data, **cleaned}):
            continue

        raw = data.get(key, None)
        if raw is None or (isinstance(raw, str) and raw.strip() == ""):
            if required:
                errors.append(f"Field '{key}' is required")
            continue

        if data_type == "string" or data_type == "date":
            cleaned[key] = str(raw).strip()
        elif data_type == "number":
            try:
                if isinstance(raw, bool):
                    raise ValueError
                cleaned[key] = int(raw) if float(raw).is_integer() else float(raw)
            except (TypeError, ValueError):
                errors.append(f"Field '{key}' must be a number")
        elif data_type == "boolean":
            if isinstance(raw, bool):
                cleaned[key] = raw
            elif str(raw).strip().lower() in {"true", "1", "yes"}:
                cleaned[key] = True
            elif str(raw).strip().lower() in {"false", "0", "no"}:
                cleaned[key] = False
            else:
                errors.append(f"Field '{key}' must be a boolean")
        elif data_type == "select":
            value = str(raw).strip()
            options = field.get("options") or []
            if value not in options:
                errors.append(f"Field '{key}' must be one of: {', '.join(options)}")
            else:
                cleaned[key] = value
        elif data_type == "file":
            # File content is uploaded separately; allow URI/string placeholder.
            cleaned[key] = str(raw).strip()
        else:
            errors.append(f"Unsupported data_type for field '{key}'")

    # Keep non-template helper keys that issue flow may set later (e.g. username)
    # but drop unknown subject keys from the request to avoid spoofing.
    if errors:
        raise ValueError("; ".join(errors))
    return cleaned
