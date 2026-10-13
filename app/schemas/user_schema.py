from pydantic import (BaseModel,EmailStr)
from typing import Literal


class UserRegister(BaseModel):

    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: Literal["admin", "user"] = "user"


class UserLogin(BaseModel):

    email: EmailStr
    password: str