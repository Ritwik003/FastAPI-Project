from fastapi import APIRouter, Depends
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.user_schema import UserRegister
from app.services.user_services import (
    get_all_users_service,
    create_user_service,
    delete_user_service
)

from app.services.auth_services import require_admin


user_routes = APIRouter(
    prefix="/users",
    tags=["Users"]

)


@user_routes.get("/")
def get_all_users(
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)
):

    return get_all_users_service(db)



@user_routes.post("/create-user")
def create_user(
    user_data: UserRegister,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)

):

    return create_user_service(
        user_data,
        db
    )



@user_routes.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)

):
    return delete_user_service(
        user_id,
        db
    )

