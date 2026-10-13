# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session
from app.models.models import User



def get_user_by_email(
    db: Session,
    email: str
):

    return db.query(User).filter(
        User.email == email
    ).first()



def create_user_repo(
    db: Session,
    user
):

    db.add(user)
    db.commit()
    db.refresh(user)
    return user



def get_all_users_repo(
    db: Session
):

    return db.query(User).all()



def delete_user_repo(
    db: Session,
    user_id: int
):

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if not user:

        return None

    db.delete(user)

    db.commit()

    return user


def get_user_by_id(

    db: Session,

    user_id: int

):

    return db.query(User).filter(

        User.id == user_id

    ).first()