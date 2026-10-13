from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.models.models import User, Doctor

from app.auth.hashing import hash_password

from app.repositories.user_repository import (get_user_by_email,create_user_repo)
from app.repositories.doctor_repository import (create_doctor_repo)
from app.repositories.doctor_repository import (
    get_all_doctors_repo
)
from app.repositories.doctor_repository import (
    get_doctor_by_user_id
)

from app.repositories.patient_repository import (
    get_patients_by_doctor_id
)

from fastapi import HTTPException

def create_doctor_service(

    doctor_data,

    db: Session

):

    existing_user = get_user_by_email(

        db,

        doctor_data.email

    )

    if existing_user:

        raise HTTPException(

            status_code=400,

            detail="User already exists"

        )

    hashed_password = hash_password(
        doctor_data.password
    )

    new_user = User(

        first_name=doctor_data.first_name,

        last_name=doctor_data.last_name,

        email=doctor_data.email,

        password=hashed_password,

        role="doctor"

    )

    created_user = create_user_repo(db,new_user)
    new_doctor = Doctor(

        user_id=created_user.id,  
        doctor_name=doctor_data.doctor_name,
        specialization=doctor_data.specialization
    )

    return create_doctor_repo(db,new_doctor)


def get_all_doctors_service(db: Session):

    return get_all_doctors_repo(db)


def get_my_patients_service(

    db: Session,

    current_user

):

    doctor = get_doctor_by_user_id(

        db,

        current_user.id

    )

    if not doctor:

        raise HTTPException(

            status_code=404,

            detail="Doctor profile not found"

        )

    patients = get_patients_by_doctor_id(

        db,

        doctor.id

    )

    return patients