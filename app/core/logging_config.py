"""
Configuración de logging.
"""
import logging
import sys
from app.core.config import get_settings

settings = get_settings()


def setup_logging() -> None:
    """Configura el logging de la aplicación."""
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=[logging.StreamHandler(sys.stdout)],
    )
    logging.getLogger("uvicorn").setLevel(level)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
