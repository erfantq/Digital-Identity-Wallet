from fastapi import FastAPI
from contextlib import asynccontextmanager

from auth import router as auth_router
from did import router as did_router
from app.src.messaging import event_bus
from app.src.exceptions import http_exception_handler, general_exception_handler
from fastapi.exceptions import HTTPException

import logging

@asynccontextmanager
async def lifespan(app: FastAPI):
    await event_bus.connect()
    yield
    await event_bus.close()


# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Digital Identity Wallet",
    lifespan=lifespan
)

app.include_router(auth_router)
app.include_router(did_router)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)