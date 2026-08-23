from sqlalchemy import Column, Integer, String, JSON, Enum, DateTime
from sqlalchemy.sql import func
from app.src.common.database import Base
from .enums import CredentialStatus

class Credential(Base):
    __tablename__="credentials"

    id = Column(Integer, primary_key=True, index=True)

    # Example: urn:uuid:550e8400-e29b-41d4-a716-446655440000
    credential_id = Column(String(255), unique=True, index=True, nullable=False)

    # Example: did:ethr:0x...
    issuer = Column(String(255), nullable=False)

    # Example: did:ethr:0x...
    holder_did = Column(String(255), nullable=False, index=True) 

    type = Column(String, default="VerifiableCredential")

    credential = Column(JSON, nullable=False)

    credential_hash = Column(String(66), nullable=True)
    tx_hash = Column(String(66), nullable=True)
    block_number = Column(Integer, nullable=True)
    revoke_tx_hash = Column(String(66), nullable=True)
    sbt_token_id = Column(Integer, nullable=True)
    sbt_tx_hash = Column(String(66), nullable=True)
    sbt_token_uri = Column(String(512), nullable=True)
    sbt_revoke_tx_hash = Column(String(66), nullable=True)

    status = Column(
        Enum(
            CredentialStatus,
            values_callable=lambda enum_class: [item.value for item in enum_class],
        ),
        nullable=False,
        default=CredentialStatus.ACTIVE,
    )
    
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by = Column(Integer, nullable=True, index=True)
    revoke_reason = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    
    
# class KnownDid(Base):
#     __tablename__ = "known_dids"

#     did = Column(String, unique=True, index=True, nullable=False)