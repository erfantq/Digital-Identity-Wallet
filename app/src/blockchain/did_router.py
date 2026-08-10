import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.src.blockchain.schemas import DeactivateDidRequest
from app.src.blockchain.did_registry import (
    DIDRegistryError,
    get_did_registry,
)
from app.src.common.auth_dependencies import CurrentUser, require_admin
from app.src.common.response import success_response

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/blockchain/dids",
    tags=["did-registry"],
)


@router.get("/status")
def get_did_on_chain_status(
    did: str = Query(..., description="Full DID string"),
):
    try:
        registry = get_did_registry()
        record = registry.get_did_record(did)
        return success_response(
            data=record,
            message="DID on-chain status fetched successfully",
        )
    except DIDRegistryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to fetch DID on-chain status did=%s", did)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"DID not found on-chain or unreadable: {exc}",
        )


@router.post("/deactivate")
def deactivate_did_on_chain(
    request: DeactivateDidRequest,
    _: CurrentUser = Depends(require_admin),
):
    try:
        registry = get_did_registry()
        result = registry.deactivate_did(request.did)
        return success_response(
            data={"did": request.did, **result},
            message="DID deactivated on-chain successfully",
        )
    except DIDRegistryError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except Exception as exc:
        logger.exception("Failed to deactivate DID on-chain did=%s", request.did)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to deactivate DID: {exc}",
        )
