from fastapi import HTTPException

from sqlalchemy.orm import Session

from app.models.models import PatientComment

from app.repositories.comment_repository import (

    create_comment_repo,

    get_comments_by_patient_id

)

from app.repositories.doctor_repository import (
    get_doctor_by_user_id
)

from app.repositories.patient_repository import (
    get_patient_by_id
)

def get_patient_comments_service(

    patient_id: str,

    db: Session,

    current_user

):

    doctor = get_doctor_by_user_id(

        db,

        current_user.id

    )

    patient = get_patient_by_id(

        db,

        patient_id

    )

    if patient.doctor_id != doctor.id:

        raise HTTPException(

            status_code=403,

            detail="Unauthorized"

        )

    comments = get_comments_by_patient_id(

        db,

        patient_id

    )

    return {

        "patient": patient,

        "comments": comments

    }

def add_comment_service(

    comment_data,

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

    patient = get_patient_by_id(

        db,

        comment_data.patient_id

    )

    if not patient:

        raise HTTPException(

            status_code=404,

            detail="Patient not found"

        )

    if patient.doctor_id != doctor.id:

        raise HTTPException(

            status_code=403,

            detail="You can only comment on assigned patients"

        )

    new_comment = PatientComment(

        patient_id=comment_data.patient_id,

        doctor_id=doctor.id,

        comment=comment_data.comment

    )

    return create_comment_repo(

        db,

        new_comment

    )