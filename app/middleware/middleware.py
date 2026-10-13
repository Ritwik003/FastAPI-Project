from fastapi import Request
import time

from fastapi.responses import JSONResponse

async def log_request(request :Request , call_next):
    print(f"Request recieved : {request.method} {request.url}")
    start_time = time.time()
    response  = await call_next (request)
    process_time = time.time() - start_time 
    print(f"Completed in {process_time} seconds")

    return response

async def process_time_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

'''
async def api_key_middleware(request: Request, call_next):
    api_key = request.headers.get("X-API-Key")
    if api_key != "mysecretkey":
        return JSONResponse(content={"detail": "Invalid API Key"}, status_code=401)
    response = await call_next(request)
    return response

'''