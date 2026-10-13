from sqlalchemy.orm import Session

from app.models.models import PatientComment


def create_comment_repo(

    db: Session,

    comment

):

    db.add(comment)

    db.commit()

    db.refresh(comment)

    return comment


def get_comments_by_patient_id(

    db: Session,

    patient_id: str

):

    return db.query(PatientComment).filter(

        PatientComment.patient_id == patient_id

    ).all()