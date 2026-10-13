from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.schemas.doctor_schema import DoctorCreate
from app.services.doctor_services import (create_doctor_service)
from app.services.auth_services import require_admin
from app.services.doctor_services import (
    get_all_doctors_service
)
from app.services.auth_services import (
    get_current_user
)

from app.services.doctor_services import (
    get_my_patients_service
)
from fastapi import HTTPException


doctor_routes = APIRouter(
    prefix="/doctor",
    tags=["Doctor"]

)


@doctor_routes.post("/create")
def create_doctor(

    doctor_data: DoctorCreate,
    db: Session = Depends(get_db),
    current_user = Depends(require_admin)

):

    return create_doctor_service(

        doctor_data,

        db

    )

@doctor_routes.get("/all-doctors")

def get_all_doctors(

    db: Session = Depends(get_db)

):

    return get_all_doctors_service(db)


@doctor_routes.get("/my-patients")

def get_my_patients(

    db: Session = Depends(get_db),

    current_user = Depends(get_current_user)

):

    if current_user.role != "doctor":

        raise HTTPException(

            status_code=403,

            detail="Only doctors can access this"

        )

    return get_my_patients_service(

        db,

        current_user

    )