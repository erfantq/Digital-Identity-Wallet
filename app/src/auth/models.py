from sqlalchemy import Column, Integer, String, DateTime, Sequence
from sqlalchemy.sql import func
from app.src.database import Base

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
