from enum import Enum


class CredentialStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


# Legacy helpers for older rows written before template registry.
LEGACY_CREDENTIAL_TYPE_MAP = {
    "UniversityCredential": "UniversityPIDCredential",
    "VerifiableCredential": "UniversityPIDCredential",
}

KNOWN_LEGACY_TYPES = {
    "UniversityPIDCredential",
    "UniversityEnrollmentCredential",
    "UniversityCertificateCredential",
}


def normalize_credential_type(value: str | None) -> str:
    """Map blank/legacy types to a known type id string."""
    if value is None:
        return "UniversityPIDCredential"
    cleaned = str(value).strip()
    if not cleaned:
        return "UniversityPIDCredential"
    if cleaned in KNOWN_LEGACY_TYPES:
        return cleaned
    return LEGACY_CREDENTIAL_TYPE_MAP.get(cleaned, cleaned)
