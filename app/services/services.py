from fastapi import HTTPException, Path, Query
from fastapi.responses import JSONResponse

'''
from app.schemas.schemas import (
    Patient,
    PatientsUpdate
)

from app.repositories.patient_repository import (
    load_data,
    save_data
)


def index():
    return {"message": "Patients management system api"}


def about():
    return {"message": "A fully functional patients management system to manage records api built with FastAPI"}


def views():
    data = load_data()
    return data


def get_patient(patient_id: str = Path(..., description="The ID of the patient to retrieve" , examples="P001")):
    data = load_data()
    if patient_id in data:
        return data[patient_id]
    else:
        raise HTTPException(status_code=404, detail="Patient not found")
    

def sort_patients(sort_by: str = Query(..., description="The field to sort by height , weight or bmi") , sort_order: str = Query("asc", description="The order to sort by, either 'asc' or 'desc'")):
    validFileds = ["height", "weight", "bmi"]
    if sort_by not in validFileds:
        raise HTTPException(status_code=400, detail="Invalid sort field")
    if sort_order not in ["asc", "desc"]:
        raise HTTPException(status_code=400, detail="Invalid sort order")
    
    data = load_data()

    sort_order = True if sort_order == "desc" else False
    sorted_data = sorted(data.values(), key=lambda x: x[sort_by], reverse=sort_order)
    return sorted_data


def create_patient(patient:Patient):
    data = load_data()
    if patient.id in data:
        raise HTTPException(status_code=400, detail="Patient with this ID already exists")
    
    data[patient.id] = patient.model_dump(exclude = ["id"])
    save_data(data)

    return JSONResponse(content={"message": f"{patient.id} Patient created successfully"}, status_code=201)

def update_patient(patient_id: str, patient_update: PatientsUpdate):

    data = load_data()
    if patient_id not in data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    existing_patient_data = data[patient_id]
    updated_patient_data = patient_update.model_dump(exclude_unset=True)

    for key, value in updated_patient_data.items():
        existing_patient_data[key] = value

    
    existing_patient_data['id'] = patient_id
    patient_pydantic_object = Patient(**existing_patient_data)
    existing_patient_data= patient_pydantic_object.model_dump(exclude= 'id')
    data[patient_id] = existing_patient_data
    save_data(data)
    return JSONResponse(content={"message": f"{patient_id} Patient updated successfully"}, status_code=200)

def delete_patient(patient_id: str):
    data = load_data()
    if patient_id not in data:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    del data[patient_id]
    save_data(data)
    return JSONResponse(content={"message": f"{patient_id} Patient deleted successfully"}, status_code=200)

'''

from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.models import Patient
from app.services.auth_services import get_current_user
from app.repositories.patient_repository import (
    get_all_patients,
    get_patient_by_id,
    create_patient_repo,
    update_patient_repo,
    delete_patient_repo
)
from app.repositories.doctor_repository import (
    get_doctor_by_id
)
from app.repositories.comment_repository import (
    get_comments_by_patient_id
)

def index_service():

    return {
        "message": "Patients management system api"
    }


def about_service():

    return {
        "message":
        "A fully functional patients management system api"
    }


def views_service(
    db: Session
):

    return get_all_patients(db)


def get_patient_service(

    patient_id: str,

    db: Session
):

    patient = get_patient_by_id(
        db,
        patient_id
    )

    if not patient:

        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    return patient


def sort_patients_service(

    sort_by: str,

    sort_order: str,

    db: Session
):

    valid_fields = [
        "height",
        "weight"
    ]

    if sort_by not in valid_fields:

        raise HTTPException(
            status_code=400,
            detail="Invalid sort field"
        )

    patients = get_all_patients(db)

    reverse = True if sort_order == "desc" else False

    return sorted(
        patients,
        key=lambda x: getattr(x, sort_by),
        reverse=reverse
    )


def create_patient_service(

    patient_data,

    db: Session
):

    existing_patient = get_patient_by_id(
        db,
        patient_data.id
    )

    if existing_patient:

        raise HTTPException(
            status_code=400,
            detail="Patient already exists"
        )
    
    doctor = get_doctor_by_id(db, patient_data.doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=400,
            detail="Invalid doctor ID"
        )

    db_patient = Patient(

        id=patient_data.id,

        name=patient_data.name,

        city=patient_data.city,

        age=patient_data.age,

        gender=patient_data.gender,

        height=patient_data.height,

        weight=patient_data.weight,

        doctor_id=patient_data.doctor_id
    )

    return create_patient_repo(
        db,
        db_patient
    )


def update_patient_service(

    patient_id,

    patient_update,

    db: Session
):

    patient = get_patient_by_id(
        db,
        patient_id
    )

    if not patient:

        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )

    update_data = patient_update.model_dump(
        exclude_unset=True
    )

    for key, value in update_data.items():

        setattr(patient, key, value)

    update_patient_repo(db)

    return {
        "message":
        "Patient updated successfully"
    }


def delete_patient_service(patient_id,db: Session):

    patient = get_patient_by_id(db,patient_id)

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found"
        )
    delete_patient_repo(db,patient)

    return {
        "message":
        "Patient deleted successfully"
    }


def get_patient_full_details_service(patient_id: str,db: Session):

    patient = get_patient_by_id(db,patient_id)

    if not patient:
        raise HTTPException(
            status_code=404,
            detail="Patient not found")

    comments = get_comments_by_patient_id(db,patient_id)

    return {
        "patient": patient,
        "comments": comments

    }