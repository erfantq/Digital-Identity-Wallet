from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from .models import User, UserRoleEnum, wallet_index_seq
from app.src.did.models import Did

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


def list_users_query(
    db: Session,
    search: str | None = None,
    role: UserRoleEnum | None = None,
):
    query = (
        db.query(User, Did)
        .outerjoin(Did, Did.user_id == User.id)
        .order_by(User.id.desc())
    )

    if search:
        term = f"%{search.strip()}%"
        query = query.filter(
            or_(User.username.ilike(term), User.email.ilike(term))
        )

    if role is not None:
        query = query.filter(User.role == role)

    return query


def delete_user(db: Session, user_id: int) -> bool:
    user = get_user_by_id(db, user_id)
    if not user:
        return False

    db.delete(user)
    db.commit()
    return True