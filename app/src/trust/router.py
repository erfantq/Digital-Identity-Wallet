import logging



from fastapi import APIRouter, Depends, HTTPException, status



from app.src.trust.registry import (

    TrustedEntityRegistryError,

    get_trusted_entity_registry,

)

from app.src.trust.schemas import AuthorizeIssuerRequest, RevokeIssuerRequest

from app.src.common.auth_dependencies import CurrentUser, require_super_admin

from app.src.common.response import success_response

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/trusted-entities",
    tags=["trusted-entities"],
)


@router.get("/{account}/is-authorized-issuer")
def check_authorized_issuer(account: str):

    try:
        registry = get_trusted_entity_registry()
        authorized = registry.is_authorized_issuer(account)
        return success_response(
            data={"account": account, "is_authorized_issuer": authorized},
            message="Issuer authorization checked successfully",
        )
    except TrustedEntityRegistryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )

    except Exception as exc:

        logger.exception("Failed issuer authorization check for %s", account)
        raise HTTPException(

            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check issuer authorization: {exc}",
        )





@router.post("/authorize")
def authorize_issuer(
    request: AuthorizeIssuerRequest,
    _: CurrentUser = Depends(require_super_admin),
):
    try:
        registry = get_trusted_entity_registry()
        result = registry.authorize_issuer(request.account)
        return success_response(
            data=result,
            message="Issuer authorized on-chain successfully",
        )
    except TrustedEntityRegistryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    except Exception as exc:
        logger.exception("Failed to authorize issuer")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to authorize issuer: {exc}",
        )


@router.post("/revoke")
def revoke_issuer(
    request: RevokeIssuerRequest,
    _: CurrentUser = Depends(require_super_admin),
):
    try:
        registry = get_trusted_entity_registry()
        result = registry.revoke_issuer(request.account)
        return success_response(
            data=result,
            message="Issuer revoked on-chain successfully",
        )
    except TrustedEntityRegistryError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    except Exception as exc:
        logger.exception("Failed to revoke issuer account=%s", request.account)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to revoke issuer: {exc}",
        )
