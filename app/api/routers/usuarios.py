"""Router de usuarios - listar y asignar roles."""
import asyncio
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db, SessionLocal
from app.api.auth import get_current_user
from app.models import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.services.usuario_service import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

LISTAS_PRECIOS = ("lista_1", "lista_2", "lista_3", "lista_plus", "lista_plus_costa")


class AsignarRolRequest(BaseModel):
    usuario_id: int
    rol_id: int


def _require_admin(db: Session, usuario: Usuario) -> None:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    if "admin" not in roles:
        raise HTTPException(403, "Solo administradores pueden acceder")


def _listar_usuarios_sync(skip: int, limit: int, usuario_id: int):
    db = SessionLocal()
    try:
        usuario = db.query(Usuario).get(usuario_id)
        if not usuario:
            raise HTTPException(401, "Usuario no encontrado")
        _require_admin(db, usuario)
        return UsuarioService(db).listar_con_roles(skip, limit)
    finally:
        db.close()


@router.get("")
async def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: Usuario = Depends(get_current_user),
):
    return await asyncio.to_thread(_listar_usuarios_sync, skip, limit, current_user.id)


@router.post("/asignar-rol")
def asignar_rol(
    data: AsignarRolRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    return UsuarioService(db).asignar_rol(data.usuario_id, data.rol_id)


class SetRolesBody(BaseModel):
    rol_ids: list[int]


@router.put("/{usuario_id}/roles")
def set_roles(
    usuario_id: int,
    data: SetRolesBody,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    UsuarioService(db).set_roles(usuario_id, data.rol_ids)
    return {"rol_ids": data.rol_ids}


@router.get("/{usuario_id}/listas")
def obtener_listas(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
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
):
    _require_admin(db, current_user)
    listas = [l for l in data.listas if l in LISTAS_PRECIOS]
    from app.repositories.vendedor_lista_repository import VendedorListaRepository
    VendedorListaRepository(db).set_listas(usuario_id, listas)
    return {"listas": listas}
