from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException


async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": False,
            "message": exc.detail,
            "data": None
        }
    )


async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "status": False,
            "message": "Internal Server Error",
            "data": None
        }
    )