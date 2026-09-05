from app.src.common.database import Base, create_session_factory, create_get_db
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
from .enums import UserRoleEnum
from .models import User
from .security import ALGORITHM, SECRET_KEY

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine, SessionLocal = create_session_factory(DATABASE_URL)

get_db = create_get_db(SessionLocal)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user_from_db(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")

        if not username:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.username == username).first()

    if user is None:
        raise credentials_exception

    return user


def require_admin_from_db(
    current_user: User = Depends(get_current_user_from_db),
):
    role = current_user.role
    role_value = role.value if hasattr(role, "value") else role
    if role_value not in (UserRoleEnum.ADMIN.value, UserRoleEnum.SUPER_ADMIN.value):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user


def require_super_admin_from_db(
    current_user: User = Depends(get_current_user_from_db),
):
    role = current_user.role
    role_value = role.value if hasattr(role, "value") else role
    if role_value != UserRoleEnum.SUPER_ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )

    return current_user


get_current_user = get_current_user_from_db
require_admin = require_admin_from_db
require_super_admin = require_super_admin_from_db
