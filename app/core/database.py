"""
Conexión a PostgreSQL con SQLAlchemy 2.0.
Optimizado para múltiples usuarios simultáneos.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base

from app.core.config import get_settings

settings = get_settings()

# Pool reducido por worker: cada uno mantiene unas pocas conexiones ya
# autenticadas en vez de abrir una nueva por cada request (el proceso uvicorn
# es de larga duración, incluso detrás del pooler de Supabase en :6543).
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=2,
    pool_recycle=300,
    pool_timeout=15,
    connect_args={"connect_timeout": 10},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
