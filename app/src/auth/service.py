from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from .security import hash_password, verify_password, create_access_token
from .repository import (
    get_user_by_username,
    get_user_by_email,
    create_user,
    get_next_wallet_index
)
from app.src.blockchain.hdWallet import derive_wallet_from_index
from app.src.common.messaging import event_bus
from app.src.common.response import success_response, error_response
from web3 import Web3
from .enums import UserRoleEnum

async def register_user(
    db: Session,
    username: str,
    password: str,
    email: str | None = None,
    role: UserRoleEnum = UserRoleEnum.USER,
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
        
    wallet_index = get_next_wallet_index(db)

    wallet = derive_wallet_from_index(wallet_index)
    
    # eth_address = Web3.to_checksum_address(wallet.address)
    eth_address = wallet.address

    user = create_user(
        db=db,
        username=username,
        email=email,
        password_hash=hash_password(password),
        wallet_index=wallet.wallet_index,
        eth_address=eth_address,
        role=role
    )

    await event_bus.publish(
        "user.created",
        {
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "eth_address": wallet.address,
            "role": user.role.value if hasattr(user.role, "value") else user.role
        }
    )

    return success_response(
        data={
            "user_id": user.id,
            "username": user.username,
            "email": user.email,
            "eth_address": user.eth_address,
            "role": user.role.value if hasattr(user.role, "value") else user.role
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
        "user_id": user.id,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "wallet_index": user.wallet_index,
        "eth_address": user.eth_address,
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }
