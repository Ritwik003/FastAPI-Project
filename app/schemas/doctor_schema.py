from pydantic import BaseModel, EmailStr


class DoctorCreate(BaseModel):

    first_name: str

    last_name: str

    email: EmailStr

    password: str

    doctor_name: str

    specialization: str