from typing import AsyncGenerator
# from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import declarative_base
from typing import Generator
from sqlalchemy.orm import Session

Base = declarative_base()


# def create_session_factory(database_url: str):
#     engine = create_async_engine(
#         database_url,
#         echo=False,
#         pool_pre_ping=True
#     )

#     SessionLocal = async_sessionmaker(
#         bind=engine,
#         expire_on_commit=False,
#         autoflush=False
#     )

#     return engine, SessionLocal

def create_session_factory(database_url: str):
    engine = create_engine(
        database_url,
        echo=False,
    )

    SessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    return engine, SessionLocal

# def create_get_db(SessionLocal):
#     async def get_db() -> AsyncGenerator[AsyncSession, None]:
#         async with SessionLocal() as session:
#             yield session

#     return get_db

def create_get_db(SessionLocal):
    def get_db() -> Generator[Session, None, None]:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    return get_db