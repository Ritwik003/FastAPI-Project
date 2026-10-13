from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker ,declarative_base
from app.utils.settings import settings

Base = declarative_base()

engine = create_engine(url=settings.DB_Configuration)
localSession= sessionmaker(bind=engine)

def get_db():
    session = localSession()
    try:
        yield session
    finally:
        session.close()