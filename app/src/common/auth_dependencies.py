from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.src.auth.enums import UserRoleEnum
from app.src.auth.security import ALGORITHM, SECRET_KEY

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


@dataclass
class CurrentUser:
    user_id: int
    username: str
    role: UserRoleEnum
    wallet_index: int | None = None
    eth_address: str | None = None


def get_current_user_from_token(
    token: str = Depends(oauth2_scheme),
) -> CurrentUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise credentials_exception

    username = payload.get("sub")
    user_id = payload.get("user_id")
    role = payload.get("role")

    if username is None or user_id is None or role is None:
        raise credentials_exception

    try:
        user_role = UserRoleEnum(role)
    except ValueError:
        raise credentials_exception

    try:
        parsed_user_id = int(user_id)
    except (TypeError, ValueError):
        raise credentials_exception

    return CurrentUser(
        user_id=parsed_user_id,
        username=username,
        role=user_role,
        wallet_index=payload.get("wallet_index"),
        eth_address=payload.get("eth_address"),
    )


def require_admin(
    current_user: CurrentUser = Depends(get_current_user_from_token),
) -> CurrentUser:
    if current_user.role != UserRoleEnum.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user


def require_roles(allowed_roles: list[UserRoleEnum]):
    def dependency(
        current_user: CurrentUser = Depends(get_current_user_from_token),
    ) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )

        return current_user

    return dependency
