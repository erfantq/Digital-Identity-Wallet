from sqlalchemy import Column, Integer, String, DateTime, Sequence, Enum as SqlEnum
from sqlalchemy.sql import func
from app.src.common.database import Base
from .enums import UserRoleEnum

wallet_index_seq = Sequence("wallet_index_seq", start=1, increment=1)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True, index=True)
    password_hash = Column(String(255), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    wallet_index = Column(
        Integer,
        wallet_index_seq,
        unique=True,
        nullable=False,
    )

    eth_address = Column(String(42), unique=True, nullable=False)

    role = Column(
        SqlEnum(
            UserRoleEnum,
            name="user_role_enum",
            values_callable=lambda enum_class: [item.value for item in enum_class],
        ),
        nullable=False,
        default=UserRoleEnum.USER,
        server_default=UserRoleEnum.USER.value,
    )
