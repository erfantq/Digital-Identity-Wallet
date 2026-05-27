from sqlalchemy.orm import Session
from sqlalchemy import text
from .models import User, wallet_index_seq


def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(db: Session, username: str, password_hash: str, email: str | None = None):
    user = User(
        username=username,
        email=email,
        password_hash=password_hash
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

def get_next_wallet_index(db: Session) -> int:
    result = db.execute(wallet_index_seq)
    return result.scalar_one()