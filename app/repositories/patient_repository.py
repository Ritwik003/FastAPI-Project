import json
'''
def load_data():
    with open("patients.json","r") as f:
         data =  json.load(f)
    return data

def save_data(data):
    with open("patients.json","w") as f:
        json.dump(data,f)

'''
from sqlalchemy.orm import Session

from app.models.models import Patient


def get_all_patients(
    db: Session
):

    return db.query(
        Patient
    ).all()


def get_patient_by_id(

    db: Session,

    patient_id: str
):

    return db.query(
        Patient
    ).filter(
        Patient.id == patient_id
    ).first()


def create_patient_repo(

    db: Session,

    patient
):

    db.add(patient)

    db.commit()

    db.refresh(patient)

    return patient


def update_patient_repo(
    db: Session
):

    db.commit()


def delete_patient_repo(

    db: Session,

    patient
):

    db.delete(patient)

    db.commit()


def get_patients_by_doctor_id(

    db: Session,

    doctor_id: int

):

    return db.query(Patient).filter(

        Patient.doctor_id == doctor_id

    ).all()