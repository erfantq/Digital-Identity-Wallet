from pydantic import BaseModel

class CredentialIssue(BaseModel):
    issuer_did: str
    holder_did: str
    credential_data: dict
    signature: str