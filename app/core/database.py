"""
Conexión a PostgreSQL con SQLAlchemy 2.0 (síncrono, driver psycopg 3).

Los endpoints son `def`: FastAPI los ejecuta en un threadpool, de modo que
varias peticiones esperan a la BD en paralelo sin bloquear el event loop.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, declarative_base

from app.core.config import get_settings

settings = get_settings()


def _normalizar_url(url: str) -> str:
    """Fuerza el driver psycopg 3 (el de requirements.txt). Con
    `postgresql://` SQLAlchemy elegiría psycopg2, que puede estar instalado en
    local pero no en producción -- causa de diferencias entre entornos."""
    for prefijo in ("postgres://", "postgresql://"):
        if url.startswith(prefijo):
            return "postgresql+psycopg://" + url[len(prefijo):]
    return url


DATABASE_URL = _normalizar_url(settings.DATABASE_URL)

_connect_args: dict = {"connect_timeout": 10}
if DATABASE_URL.startswith("postgresql+psycopg://"):
    # El pooler de Supabase (puerto 6543) usa PgBouncer en modo transacción,
    # que no soporta prepared statements. psycopg 3 los crea automáticamente
    # tras unas cuantas ejecuciones; sin esto aparecen errores intermitentes
    # "prepared statement ... already exists" bajo carga.
    _connect_args["prepare_threshold"] = None

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=300,
    connect_args=_connect_args,
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
