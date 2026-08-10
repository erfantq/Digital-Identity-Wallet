import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from prometheus_fastapi_instrumentator import Instrumentator

from app.src.auth.router import router as auth_router
from app.src.did.router import router as did_router
from app.src.credential.router import router as cred_router
from app.src.blockchain.router import router as blockchain_router
from app.src.blockchain.did_router import router as did_registry_router
from app.src.common.messaging import event_bus
from app.src.did.events import handle_user_created, handle_did_created
from app.src.common.exceptions import (
    http_exception_handler,
    general_exception_handler,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,
)

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Digital Identity Wallet backend...")
    await event_bus.connect()
    await event_bus.subscribe("user.created", handle_user_created)
    await event_bus.subscribe("did.created", handle_did_created)
    logger.info("Backend startup complete")
    
    yield
    
    logger.info("Shutting down Digital Identity Wallet backend...")
    await event_bus.close()
    logger.info("Backend shutdown complete")


app = FastAPI(
    title="Digital Identity Wallet",
    description="Backend API for Digital Identity Wallet platform",
    version="1.0.0",
    lifespan=lifespan,
)


# Prometheus metrics
Instrumentator().instrument(app).expose(app)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(did_router)
app.include_router(cred_router)
app.include_router(blockchain_router)
app.include_router(did_registry_router)

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)