from sqlalchemy.orm import Session
from .models import Did

def check_did_exists(did: str, db: Session) -> bool:
    return db.query(Did).filter(Did.did == did).first() is not None
