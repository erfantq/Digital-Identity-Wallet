from fastapi import FastAPI
from contextlib import asynccontextmanager

from app.src.auth.router import router as auth_router
from app.src.messaging import event_bus
from app.src.exceptions import http_exception_handler, general_exception_handler
from fastapi.exceptions import HTTPException
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
    await event_bus.connect()
    yield
    await event_bus.close()




app = FastAPI(
    title="Auth Service",
    lifespan=lifespan
)

app.include_router(auth_router)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)