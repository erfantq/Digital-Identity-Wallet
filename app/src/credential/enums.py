from enum import Enum


class CredentialStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


class CredentialType(str, Enum):
    """University VC types accepted by issue API and admin UI."""

    UNIVERSITY_PID = "UniversityPIDCredential"
    UNIVERSITY_ENROLLMENT = "UniversityEnrollmentCredential"
    UNIVERSITY_CERTIFICATE = "UniversityCertificateCredential"


# Legacy `credentials.type` values written before strict validation.
LEGACY_CREDENTIAL_TYPE_MAP = {
    "UniversityCredential": CredentialType.UNIVERSITY_PID.value,
    "VerifiableCredential": CredentialType.UNIVERSITY_PID.value,
}


def normalize_credential_type(value: str | None) -> str:
    """Map blank/legacy types to a valid university credential type."""
    if value is None:
        return CredentialType.UNIVERSITY_PID.value
    cleaned = str(value).strip()
    if not cleaned:
        return CredentialType.UNIVERSITY_PID.value
    if cleaned in {item.value for item in CredentialType}:
        return cleaned
    return LEGACY_CREDENTIAL_TYPE_MAP.get(cleaned, CredentialType.UNIVERSITY_PID.value)