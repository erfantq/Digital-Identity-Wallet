from pydantic import BaseModel, Field


class AuthorizeIssuerRequest(BaseModel):
    account: str = Field(..., description="Ethereum address of the issuer to authorize")


class RevokeIssuerRequest(BaseModel):
    account: str = Field(..., description="Ethereum address of the issuer to revoke")
