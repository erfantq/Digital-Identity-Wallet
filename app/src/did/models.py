from sqlalchemy import Column, Integer, String, JSON, DateTime
from sqlalchemy.sql import func
from app.src.common.database import Base


class Did(Base):
    __tablename__ = "dids"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, nullable=False)  # users.id

    did = Column(String, unique=True, index=True, nullable=False)
    ethereum_address = Column(String, nullable=False)

    document = Column(JSON, nullable=True)
    document_hash = Column(String, nullable=True)

    tx_hash = Column(String, nullable=True)
    block_number = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

