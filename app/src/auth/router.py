from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .dependencies import get_db
from .schemas import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse
)
from .service import register_user, login_user

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


@router.post("/register", response_model=RegisterResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    return await register_user(
        db=db,
        username=request.username,
        password=request.password,
        email=request.email
    )


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    return login_user(
        db=db,
        username=request.username,
        password=request.password
    )