from sqlalchemy.orm import Session

from .models import Credential


def get_credential_by_id(db: Session, credential_id: str) -> Credential | None:
    return (
        db.query(Credential)
        .filter(Credential.credential_id == credential_id)
        .first()
    )


def update_credential_chain_anchor(
    db: Session,
    credential_id: str,
    credential_hash: str,
    tx_hash: str,
    block_number: int,
) -> Credential | None:
    record = get_credential_by_id(db, credential_id)
    if not record:
        return None

    record.credential_hash = credential_hash
    record.tx_hash = tx_hash
    record.block_number = block_number
    db.commit()
    db.refresh(record)
    return record


def update_credential_revoke_anchor(
    db: Session,
    credential_id: str,
    revoke_tx_hash: str,
) -> Credential | None:
    record = get_credential_by_id(db, credential_id)
    if not record:
        return None

    record.revoke_tx_hash = revoke_tx_hash
    db.commit()
    db.refresh(record)
    return record
