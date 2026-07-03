from fastapi import FastAPI
from contextlib import asynccontextmanager

from .router import router as cred_router
from .events import handle_did_created
from app.src.common.messaging import event_bus
from app.src.common.exceptions import http_exception_handler, general_exception_handler
from fastapi.exceptions import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.src import models
import logging
import sys

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True,
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up Credential service...")
    await event_bus.connect()
    # Subscribe to did.created events
    # await event_bus.subscribe("did.created", handle_did_created)
    # event_bus.start_consuming_in_thread()
    logger.info("Credential service startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Credential service...")
    await event_bus.close()
    logger.info("Credential service shutdown complete")


app = FastAPI(
    title="Credential Service",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cred_router)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)