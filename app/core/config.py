"""
Configuración centralizada desde variables de entorno.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=True)

    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:54322/postgres"
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_ANON_KEY: str = "your-anon-key"
    SUPABASE_SERVICE_ROLE_KEY: str = "your-service-role-key"
    SUPABASE_JWT_SECRET: str | None = None  # JWT Secret para verificación HS256 (fallback)

    CORS_ORIGINS: str = "*"
    API_V1_PREFIX: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # --- Concurrencia (pensado para 1 worker de uvicorn) ---
    # Hilos para endpoints/dependencias `def` (SQLAlchemy síncrono). Cada
    # request concurrente que toca la BD ocupa un hilo mientras espera.
    THREADPOOL_SIZE: int = 40
    # Conexiones a la BD por worker. Deben ser <= THREADPOOL_SIZE; las
    # peticiones que no consiguen conexión esperan DB_POOL_TIMEOUT segundos.
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30

    # Endpoints /debug/* (diagnóstico de auth). Apagados por defecto: exponen
    # detalles internos. Activar con DEBUG_ENDPOINTS=true solo en local.
    DEBUG_ENDPOINTS: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
