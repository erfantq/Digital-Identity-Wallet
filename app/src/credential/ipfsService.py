import os
import httpx
from fastapi import UploadFile

PINATA_API_KEY = os.getenv("PINATA_API_KEY")
PINATA_SECRET_API_KEY = os.getenv("PINATA_SECRET_API_KEY")
PINATA_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS"
PINATA_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS"


class IpfsUploadError(Exception):
    """Raised when pinning to Pinata/IPFS fails."""


def _pinata_headers() -> dict[str, str]:
    api_key = os.getenv("PINATA_API_KEY")
    secret = os.getenv("PINATA_SECRET_API_KEY")
    if not api_key or not secret:
        raise IpfsUploadError(
            "PINATA_API_KEY / PINATA_SECRET_API_KEY are not configured"
        )
    return {
        "pinata_api_key": api_key,
        "pinata_secret_api_key": secret,
    }


def _ipfs_uri_from_response(response: httpx.Response) -> str:
    if response.status_code != 200:
        raise IpfsUploadError(
            f"Failed to upload to IPFS ({response.status_code}): {response.text}"
        )
    cid = response.json().get("IpfsHash")
    if not cid:
        raise IpfsUploadError(f"Pinata response missing IpfsHash: {response.text}")
    return f"ipfs://{cid}"


async def upload_file_to_ipfs(file: UploadFile) -> httpx.Response:
    file_content = await file.read()
    files = {
        "file": (file.filename, file_content, file.content_type),
    }
    timeout = httpx.Timeout(60.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        return await client.post(
            PINATA_FILE_URL,
            files=files,
            headers=_pinata_headers(),
        )


async def upload_json_to_ipfs(payload: dict, name: str = "certificate-nft") -> str:
    timeout = httpx.Timeout(60.0)
    body = {
        "pinataContent": payload,
        "pinataMetadata": {"name": name},
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(
            PINATA_JSON_URL,
            json=body,
            headers=_pinata_headers(),
        )
    return _ipfs_uri_from_response(response)
