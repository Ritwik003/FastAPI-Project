from app.config.database import Base
from sqlalchemy import Column, String, Integer, Float
from app.config.database import Base
from sqlalchemy import ForeignKey
from sqlalchemy import DateTime
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float
)


class User(Base):

    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    first_name = Column(String(50))

    last_name = Column(String(100))

    email = Column(
        String(100),
        unique=True
    )

    password = Column(String(100))
    role = Column(String, default="user")


class Patient(Base):

    __tablename__ = "patients"

    id = Column(
        String,
        primary_key=True,
        index=True
    )

    name = Column(String(100))

    age = Column(Integer)

    gender = Column(String(20))

    height = Column(Float)

    weight = Column(Float)

    city = Column(String(100))

    doctor_id = Column(
    Integer,
    ForeignKey("doctors.id")
)



class Doctor(Base):

    __tablename__ = "doctors"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id")
    )

    doctor_name = Column(String)

    specialization = Column(String)


class PatientComment(Base):

    __tablename__ = "patient_comments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    patient_id = Column(
        String,
        ForeignKey("patients.id")
    )

    doctor_id = Column(
        Integer,
        ForeignKey("doctors.id")
    )

    comment = Column(String)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )