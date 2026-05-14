from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from .security import hash_password, verify_password, create_access_token
from .repository import (
    get_user_by_username,
    get_user_by_email,
    create_user
)
from app.src.messaging import event_bus
from app.src.response import success_response, error_response
from app.src.blockchain.ethereum import generate_ethereum_account


async def register_user(
    db: Session,
    username: str,
    password: str,
    email: str | None = None
):
    existing_username = get_user_by_username(db, username)

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )

    if email:
        existing_email = get_user_by_email(db, email)

        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already exists"
            )

    user = create_user(
        db=db,
        username=username,
        email=email,
        password_hash=hash_password(password)
    )

    # Create Ethereum account for DID
    eth_account = generate_ethereum_account()

    await event_bus.publish(
        "user.created",
        {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "eth_address": eth_account["address"]
        }
    )

    return success_response(
        data={
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "eth_address": eth_account["address"]
        },
        message="User registered successfully. DID creation started."   
    )


def login_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    token = create_access_token({
        "sub": user.username,
        "user_id": user.id
    })

    return success_response(
        data={
            "access_token": token,
            "token_type": "bearer"
        },
        message="Login successful"
    )