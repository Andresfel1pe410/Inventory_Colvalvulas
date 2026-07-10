"""Router de usuarios - listar y asignar roles."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.api.deps import require_admin
from app.models import Usuario
from app.services.usuario_service import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

LISTAS_PRECIOS = ("lista_1", "lista_2", "lista_3", "lista_plus", "lista_plus_costa")


class AsignarRolRequest(BaseModel):
    usuario_id: int
    rol_id: int


@router.get("")
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return UsuarioService(db).listar_con_roles(skip, limit)


@router.post("/asignar-rol")
def asignar_rol(
    data: AsignarRolRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return UsuarioService(db).asignar_rol(data.usuario_id, data.rol_id)


class SetRolesBody(BaseModel):
    rol_ids: list[int]


@router.put("/{usuario_id}/roles")
def set_roles(
    usuario_id: int,
    data: SetRolesBody,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    UsuarioService(db).set_roles(usuario_id, data.rol_ids)
    return {"rol_ids": data.rol_ids}


@router.get("/{usuario_id}/listas")
def obtener_listas(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    from app.repositories.vendedor_lista_repository import VendedorListaRepository
    return VendedorListaRepository(db).get_listas_by_usuario(usuario_id)


class AsignarListasBody(BaseModel):
    listas: list[str]


@router.put("/{usuario_id}/listas")
def asignar_listas(
    usuario_id: int,
    data: AsignarListasBody,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    listas = [l for l in data.listas if l in LISTAS_PRECIOS]
    from app.repositories.vendedor_lista_repository import VendedorListaRepository
    VendedorListaRepository(db).set_listas(usuario_id, listas)
    return {"listas": listas}
