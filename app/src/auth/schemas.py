from pydantic import BaseModel, EmailStr
from typing import Optional
from .enums import UserRoleEnum


class RegisterRequest(BaseModel):
    username: str
    password: str
    email: Optional[EmailStr] = None
    role: Optional[UserRoleEnum] = UserRoleEnum.USER


class RegisterResponse(BaseModel):
    user_id: int
    username: str
    email: Optional[str] = None
    role: Optional[UserRoleEnum] = UserRoleEnum.USER
    message: str


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"