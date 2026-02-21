"""Router de usuarios - listar y asignar roles."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models import Usuario
from app.services.usuario_service import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


class AsignarRolRequest(BaseModel):
    usuario_id: int
    rol_id: int


@router.get("")
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return UsuarioService(db).listar_con_roles(skip, limit)


@router.post("/asignar-rol")
def asignar_rol(
    data: AsignarRolRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return UsuarioService(db).asignar_rol(data.usuario_id, data.rol_id)
