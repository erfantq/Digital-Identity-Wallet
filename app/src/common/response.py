from fastapi.responses import JSONResponse


class ResponseBuilder:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def success_response(self, data=None, message="Success", status_code=200):
        return JSONResponse(
            status_code=status_code,
            content={
                "status": True,
                "message": message,
                "data": data,
            },
        )

    def error_response(self, message="Error", status_code=400, data=None):
        return JSONResponse(
            status_code=status_code,
            content={
                "status": False,
                "message": message,
                "data": data,
            },
        )


response_builder = ResponseBuilder()
success_response = response_builder.success_response
error_response = response_builder.error_response
