from sqlalchemy import Column, Integer, String, JSON
from app.src.database import Base


class Credential(Base):
    __tablename__="credentials"

    id = Column(Integer, primary_key=True, index=True)

    credential_id = Column(Integer, unique=True, index=True, nullable=False)
    
    issuer = Column(String, default="system")

    holder_did = Column(Integer, nullable=False) # dids.did 

    type = Column(String, default="VerifiableCredential")

    credential = Column(JSON, nullable=False)
