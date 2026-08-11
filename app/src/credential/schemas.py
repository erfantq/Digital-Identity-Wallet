from pydantic import BaseModel, ValidationError, Field
import json
from fastapi import Form, HTTPException
from typing import Any


class CredentialIssue(BaseModel):
    # issuer_did: str
    holder_did: str
    type: str = "UniversityCredential"
    credential_data: dict
    # signature: str


class CredentialVerifyRequest(BaseModel):
    credential: dict[str, Any] = Field(
        ...,
        description="Full signed verifiable credential JSON",
    )


def credential_form_parser(
    cred_json: str = Form(..., description="JSON string of CredentialIssue"),
) -> CredentialIssue:
    try:
        parsed_dict = json.loads(cred_json)
        return CredentialIssue(**parsed_dict)

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400, detail="Invalid JSON format for credential data"
        )
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())
