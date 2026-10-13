from fastapi import (
    Depends,
    HTTPException
)

from jose import jwt
from app.auth.auth import oauth2_scheme
from app.auth.jwt_handler import (
    SECRET_KEY,
    ALGORITHM
)



def get_current_user(
    token: str = Depends(oauth2_scheme)
):

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        email = payload.get("sub")

        return email

    except:

        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )