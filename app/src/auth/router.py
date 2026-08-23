import re
from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .dependencies import get_db, require_admin_from_db
from app.src.common.auth_dependencies import require_admin
from .schemas import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse
)
from .service import register_user, login_user
from .models import User

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

# Admin registers a new user
@router.post("/register", response_model=RegisterResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db), admin_user: User = Depends(require_admin)):
    return await register_user(
        db=db,
        username=request.username,
        password=request.password,
        email=request.email,
        role=request.role,
    )


@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return login_user(
        db=db,
        username=form_data.username,
        password=form_data.password
    )
