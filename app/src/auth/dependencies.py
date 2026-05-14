from app.src.database import Base, create_session_factory, create_get_db
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine, SessionLocal = create_session_factory(DATABASE_URL)

get_db = create_get_db(SessionLocal)