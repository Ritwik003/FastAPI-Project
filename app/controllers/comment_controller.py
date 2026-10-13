from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.comment_schema import CommentCreate
from app.services.auth_services import (
    get_current_user
)

from app.services.comment_services import (

    add_comment_service,

    get_patient_comments_service

)

comment_routes = APIRouter(

    prefix="/comments",

    tags=["Comments"]

)

@comment_routes.post("/add-comment")

def add_comment(

    comment_data: CommentCreate,

    db: Session = Depends(get_db),

    current_user = Depends(get_current_user)

):

    return add_comment_service(

        comment_data,

        db,

        current_user

    )

@comment_routes.get("/patient-comments/{patient_id}")

def get_patient_comments(

    patient_id: str,

    db: Session = Depends(get_db),

    current_user = Depends(get_current_user)

):

    return get_patient_comments_service(

        patient_id,

        db,

        current_user

    )