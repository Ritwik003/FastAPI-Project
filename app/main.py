
from fastapi import FastAPI
from app.controllers.controllers import (patients_routes)
from app.config.database import (Base,engine)
from app.models.models import (Patient,User)
from app.controllers.auth_controller import (auth_routes)
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from app.middleware.middleware import log_request, process_time_middleware
from app.controllers.doctor_controller import doctor_routes
#Base.metadata.create_all(bind=engine)
from app.controllers.user_controller import user_routes
from app.controllers.comment_controller import comment_routes
from app.controllers.chat_controller import (chat_routes)
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(BaseHTTPMiddleware , dispatch=log_request)
app.add_middleware(
    BaseHTTPMiddleware,
    dispatch=process_time_middleware
)
#app.add_middleware(BaseHTTPMiddleware , dispatch = api_key_middleware)
app.include_router(patients_routes)
app.include_router(auth_routes)
app.include_router(user_routes)
app.include_router(doctor_routes)
app.include_router(comment_routes)
app.include_router(chat_routes)