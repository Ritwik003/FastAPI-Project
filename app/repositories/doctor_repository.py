from sqlalchemy.orm import Session
from app.models.models import Doctor


def create_doctor_repo(db: Session,doctor: Doctor):

    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


def get_doctor_by_id(
    db: Session,
    doctor_id: int):

    return db.query(Doctor).filter(

        Doctor.id == doctor_id

    ).first()


def get_all_doctors_repo(

    db: Session

):

    return db.query(Doctor).all()


def get_doctor_by_user_id(

    db: Session,

    user_id: int

):

    return db.query(Doctor).filter(

        Doctor.user_id == user_id

    ).first()


def get_doctor_by_user_id(

    db: Session,

    user_id: int

):

    return db.query(Doctor).filter(

        Doctor.user_id == user_id

    ).first()



def delete_doctor_repo(

    db: Session,

    doctor

):

    db.delete(doctor)

    db.commit()