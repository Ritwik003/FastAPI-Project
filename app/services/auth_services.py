from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.models import User
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Depends
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.repositories.user_repository import get_user_by_email
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
from app.auth.hashing import (
    hash_password,
    verify_password
)

from app.auth.jwt_handler import (
    create_access_token,
    SECRET_KEY,
    ALGORITHM
)
from app.repositories.user_repository import (
    get_user_by_email,
    create_user_repo
)



def register_user_service(
    user_data,
    db: Session
):

    existing_user = get_user_by_email(
        db,
        user_data.email
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="User already exists"
        )
    hashed_password = hash_password(
        user_data.password
    )

    db_user = User(

        first_name=user_data.first_name,

        last_name=user_data.last_name,

        email=user_data.email,

        password=hashed_password,

        role=user_data.role
    )

    return create_user_repo(
        db,
        db_user
    )

def login_service(

    form_data: OAuth2PasswordRequestForm,

    db: Session

):

    user = get_user_by_email(
        db,
        form_data.username
        
    )
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    if not verify_password(
        form_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )
    access_token = create_access_token(
        data={ "sub": user.email,"role": user.role , "user_id": user.id}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


def get_current_user(

    token: str = Depends(oauth2_scheme),

    db: Session = Depends(get_db)

):

    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials"
    )

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = get_user_by_email(
        db,
        email
    )

    if user is None:
        raise credentials_exception

    return user


def require_admin(

    current_user = Depends(get_current_user)

):

    if current_user.role != "admin":

        raise HTTPException(

            status_code=403,

            detail="Admin access required"

        )

    return current_user