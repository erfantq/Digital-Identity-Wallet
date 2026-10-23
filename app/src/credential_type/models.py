from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.src.common.database import Base


class CredentialType(Base):
    __tablename__ = "credential_types"

    type_id = Column(String(128), primary_key=True)
    display_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    revocable = Column(Boolean, nullable=False, default=False)
    fields = Column(JSONB, nullable=False, default=list)
    schema_hash = Column(String(66), nullable=True)
    tx_hash = Column(String(66), nullable=True)
    block_number = Column(Integer, nullable=True)
    created_by = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
