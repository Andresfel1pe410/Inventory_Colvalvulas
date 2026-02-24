"""
Conexión a PostgreSQL con SQLAlchemy 2.0.
Optimizado para múltiples usuarios simultáneos.
- Con pooler Supabase (puerto 6543): NullPool (el pooler ya gestiona conexiones).
- Sin pooler: pool reducido para no agotar límite de Supabase (~60 conexiones).
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()

# Usar pooler de Supabase (puerto 6543) = NullPool. Sin pooler = QueuePool conservador.
_use_pooler = "6543" in settings.DATABASE_URL or os.getenv("DATABASE_USE_POOLER", "").lower() == "true"

if _use_pooler:
    engine = create_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 10},
        echo=False,
    )
else:
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
