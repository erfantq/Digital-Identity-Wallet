from sqlalchemy.orm import Session
from sqlalchemy import text
from .models import User, UserRoleEnum, wallet_index_seq

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()


def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()


def create_user(
    db: Session,
    username: str,
    email: str | None,
    password_hash: str,
    wallet_index: int,
    eth_address: str,
    role: UserRoleEnum = UserRoleEnum.USER,
):
    user = User(
        username=username,
        email=email,
        password_hash=password_hash,
        wallet_index=wallet_index,
        eth_address=eth_address,
        role=role,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user

def get_next_wallet_index(db: Session) -> int:
    result = db.execute(text("SELECT nextval('wallet_index_seq')"))
    return result.scalar_one()