from pydantic import BaseModel


class CommentCreate(BaseModel):

    patient_id: str

    comment: str