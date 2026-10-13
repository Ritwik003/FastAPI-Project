from fastapi import APIRouter
from fastapi import (
    APIRouter,
    Depends,
    Path,
    Query
)
from app.services.auth_services import get_current_user
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.services.auth_services import get_current_user
from app.schemas.schemas import (
    Patient,
    PatientsUpdate
)
from app.services.services import (
    index_service,
    about_service,
    views_service,
    get_patient_service,
    sort_patients_service,
    create_patient_service,
    update_patient_service,
    delete_patient_service
)
from app.services.services import (
    get_patient_full_details_service
)

patients_routes = APIRouter(
    prefix="/patients",
    tags=["Patients"]
)


@patients_routes.get("/")
def index(current_user = Depends(get_current_user)):
    

    return index_service()


@patients_routes.get("/about")
def about(current_user = Depends(get_current_user)):
    

    return about_service()


@patients_routes.get("/views")
def views(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)

):

    return views_service(db)


@patients_routes.get("/sort")
def sort_patients(
    sort_by: str = Query(...)
    ,
    sort_order: str = Query("asc")
    ,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    return sort_patients_service(
        sort_by,
        sort_order,
        db
    )


@patients_routes.get("/{patient_id}")
def get_patient(

    patient_id: str = Path(...)
    ,

    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)

):

    return get_patient_service(
        patient_id,
        db
    )





@patients_routes.post("/create-patient")
def create_patient(

    patient: Patient,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    return create_patient_service(
        patient,
        db
    )


@patients_routes.put("/update-patient/{patient_id}")
def update_patient(

    patient_id: str,
    patient_update: PatientsUpdate,

    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    return update_patient_service(
        patient_id,
        patient_update,
        db
    )


@patients_routes.delete("/delete-patient/{patient_id}")
def delete_patient(

    patient_id: str,

    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):

    return delete_patient_service(
        patient_id,
        db
    )

@patients_routes.get("/patient-details/{patient_id}")
def get_patient_full_details(

    patient_id: str,

    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)

):

    return get_patient_full_details_service(

        patient_id,

        db

    )