from pydantic import BaseModel, Field


class AuthorizeIssuerRequest(BaseModel):
    account: str = Field(..., description="Ethereum address of the issuer to authorize")


class DeactivateDidRequest(BaseModel):
    did: str = Field(..., description="DID string to deactivate on-chain")
