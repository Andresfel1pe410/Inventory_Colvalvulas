"""Router de clientes - CRUD sin eliminación."""
import asyncio
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.api.auth import get_current_user
from app.models import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas import Cliente, ClienteCreate, ClienteUpdate
from app.services.cliente_service import ClienteService

router = APIRouter(prefix="/clientes", tags=["clientes"])


def _require_admin(db: Session, usuario: Usuario) -> None:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    if "admin" not in roles:
        raise HTTPException(403, "Solo administradores pueden realizar esta acción")


def _listar_clientes_sync(skip: int, limit: int, search: str | None, usuario_id: int):
    db = SessionLocal()
    try:
        usuario = db.query(Usuario).get(usuario_id)
        if not usuario:
            raise HTTPException(401, "Usuario no encontrado")
        _require_admin(db, usuario)
        return ClienteService(db).listar(skip, limit, search)
    finally:
        db.close()


@router.get("", response_model=list[Cliente])
async def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: str | None = Query(None, description="Buscar por número de documento o razón social"),
    current_user: Usuario = Depends(get_current_user),
):
    return await asyncio.to_thread(_listar_clientes_sync, skip, limit, search, current_user.id)


@router.get("/{id}", response_model=Cliente)
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return ClienteService(db).obtener(id)


@router.post("", response_model=Cliente, status_code=201)
def crear(
    data: ClienteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    return ClienteService(db).crear(data)


@router.put("/{id}", response_model=Cliente)
def actualizar(
    id: int,
    data: ClienteUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    return ClienteService(db).actualizar(id, data)


@router.delete("/{id}", status_code=204)
def eliminar(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    ClienteService(db).eliminar(id)
