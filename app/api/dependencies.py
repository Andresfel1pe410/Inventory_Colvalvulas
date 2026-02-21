"""
Dependencias de la API.
"""
from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Usuario
from app.api.auth import get_current_user


def get_db_session():
    return get_db


def get_authenticated_user(
    user: Usuario = Depends(get_current_user),
) -> Usuario:
    return user
