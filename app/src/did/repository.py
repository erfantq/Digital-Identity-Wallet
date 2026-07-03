from sqlalchemy.orm import Session
from .models import Did

def check_did_exists(db: Session, did: str) -> bool:
    return db.query(Did).filter(Did.did == did).first() is not None

def check_user_did_exists(db: Session, user_id: int) -> bool:
    return db.query(Did).filter(Did.user_id == user_id).first() is not None 

def get_did_doc_by_user_id(db: Session, user_id: int) -> Did | None:
    return db.query(Did).filter(Did.user_id == user_id).first()

