from fastapi import (
    APIRouter,
    Depends
)
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.user_schema import (UserRegister,UserLogin)
from app.services.auth_services import (register_user_service,login_service)
from app.auth.current_user import (get_current_user)



auth_routes = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


@auth_routes.post("/register")
def register_user(
    user: UserRegister,
    db: Session = Depends(get_db)
):
    return register_user_service(
        user,
        db
    )


@auth_routes.post("/login")

def login(

    form_data: OAuth2PasswordRequestForm = Depends(),

    db: Session = Depends(get_db)

):

    return login_service(
        form_data,
        db
    )


@auth_routes.get("/me")
def current_user(
    current_user: str = Depends(get_current_user)
):
    return {
        "logged_in_user": current_user
    }