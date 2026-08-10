from sqlalchemy.orm import Session
from .models import Did


def check_did_exists(db: Session, did: str) -> bool:
    return db.query(Did).filter(Did.did == did).first() is not None


def check_user_did_exists(db: Session, user_id: int) -> bool:
    return db.query(Did).filter(Did.user_id == user_id).first() is not None


def get_did_doc_by_user_id(db: Session, user_id: int) -> Did | None:
    return db.query(Did).filter(Did.user_id == user_id).first()


def get_did_by_string(db: Session, did: str) -> Did | None:
    return db.query(Did).filter(Did.did == did).first()


def update_did_chain_anchor(
    db: Session,
    did: str,
    tx_hash: str,
    block_number: int,
) -> Did | None:
    record = get_did_by_string(db, did)
    if not record:
        return None

    record.tx_hash = tx_hash
    record.block_number = block_number
    db.commit()
    db.refresh(record)
    return record
