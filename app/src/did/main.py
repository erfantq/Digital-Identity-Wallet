from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from contextlib import asynccontextmanager
from app.src.messaging import event_bus
from app.src.exceptions import http_exception_handler, general_exception_handler
from prometheus_fastapi_instrumentator import Instrumentator
from .router import router as did_router
from .events import handle_user_created
from app.src import models
import os
import logging
import sys

# Set service name for messaging
# os.environ["SERVICE_NAME"] = "did-service"

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
    logger.info("Starting up DID service...")
    await event_bus.connect()
    # Subscribe to user.created events
    await event_bus.subscribe("user.created", handle_user_created)
    event_bus.start_consuming_in_thread()
    logger.info("DID service startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down DID service...")
    await event_bus.close()
    logger.info("DID service shutdown complete")

# Initialize FastAPI with enhanced metadata
app = FastAPI(
    title="DIDentity DID Service",
    description="Decentralized Identifier (DID) management service for DIDentity platform",
    version="1.0.0",
    openapi_tags=[
        {
            "name": "dids",
            "description": "DID creation and management operations"
        },
        {
            "name": "health",
            "description": "Health check endpoint"
        },
        {
            "name": "sdk",
            "description": "SDK generation endpoints"
        }
    ],
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan
)

# Add instrumentation
Instrumentator().instrument(app).expose(app)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom OpenAPI endpoints with SDK download options
@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title=app.title + " - Swagger UI",
        oauth2_redirect_url=app.swagger_ui_oauth2_redirect_url,
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@3/swagger-ui.css",
    )

@app.get("/redoc", include_in_schema=False)
async def redoc_html():
    return get_redoc_html(
        openapi_url="/openapi.json",
        title=app.title + " - ReDoc",
        redoc_js_url="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js",
    )

# Export OpenAPI schema
@app.get("/openapi.json", include_in_schema=False)
async def get_openapi_schema():
    openapi_schema = app.openapi()
    # Force OpenAPI 3.0.3 for Swagger UI compatibility
    openapi_schema["openapi"] = "3.0.3"
    return JSONResponse(content=openapi_schema)

# Endpoint to generate client SDKs
@app.get("/sdk/{language}", tags=["sdk"])
async def generate_sdk(language: str):
    """
    Generate client SDK for the specified language.
    Currently supported: 'typescript', 'python', 'java'
    """
    if language not in ["typescript", "python", "java"]:
        raise HTTPException(status_code=400, detail=f"SDK for {language} not available")
    
    # In a real implementation, you would generate the SDK here or return pre-generated SDKs
    return {
        "message": f"SDK for {language} would be generated here",
        "steps": [
            "1. Download the OpenAPI spec from /openapi.json",
            f"2. Use an OpenAPI generator tool to create a {language} client",
            "3. Example command: openapi-generator-cli generate -i openapi.json -g " + 
            language + " -o ./generated-client"
        ]
    }


app.include_router(did_router)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, general_exception_handler)