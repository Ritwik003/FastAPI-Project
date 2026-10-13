from fastapi import HTTPException
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
# pyrefly: ignore [missing-import]
from pytest import Session
from app.models.models import User
from app.auth.hashing import hash_password
from app.models.models import Patient

from app.repositories.doctor_repository import (
    get_doctor_by_user_id,
    delete_doctor_repo
)

from app.repositories.user_repository import (

    get_all_users_repo,

    get_user_by_email,

    create_user_repo,

    delete_user_repo,
    get_user_by_id

)
def get_all_users_service(

    db: Session

):

    return get_all_users_repo(db)


def create_user_service(

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

    new_user = User(

        first_name=user_data.first_name,

        last_name=user_data.last_name,

        email=user_data.email,

        password=hashed_password,

        role=user_data.role

    )

    return create_user_repo(
        db,
        new_user
    )

'''
def delete_user_service(

    user_id: int,

    db: Session

):

    deleted_user = delete_user_repo(

        db,

        user_id

    )

    if not deleted_user:

        raise HTTPException(

            status_code=404,

            detail="User not found"

        )

    return {

        "message": "User deleted successfully"

    }
'''
def delete_user_service(

    user_id: int,

    db: Session

):

    user = get_user_by_id(

        db,

        user_id

    )

    if not user:

        raise HTTPException(

            status_code=404,

            detail="User not found"

        )

    # -------------------------
    # CHECK IF USER IS DOCTOR
    # -------------------------

    if user.role == "doctor":

        doctor = get_doctor_by_user_id(

            db,

            user.id

        )

        if doctor:

            assigned_patients = db.query(Patient).filter(

                Patient.doctor_id == doctor.id

            ).count()

            if assigned_patients > 0:

                raise HTTPException(

                    status_code=400,

                    detail="Doctor cannot be deleted because patients are assigned"

                )

            # delete doctor table entry

            delete_doctor_repo(

                db,

                doctor

            )

    # -------------------------
    # DELETE USER
    # -------------------------

    deleted_user = delete_user_repo(

        db,

        user_id

    )

    return {

        "message": "User deleted successfully"

    }


