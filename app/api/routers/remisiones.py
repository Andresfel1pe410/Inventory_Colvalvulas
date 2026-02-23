"""Router de remisiones - listado y detalle. Las remisiones se generan al marcar pedidos como enviado."""
import asyncio
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db, SessionLocal
from app.api.auth import get_current_user
from app.models import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.services.remision_service import RemisionService

router = APIRouter(prefix="/remisiones", tags=["remisiones"])


def _require_admin(db: Session, usuario: Usuario) -> None:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    if "admin" not in roles:
        raise HTTPException(403, "Solo administradores pueden acceder a remisiones")


def _listar_remisiones_sync(skip: int, limit: int, usuario_id: int):
    db = SessionLocal()
    try:
        usuario = db.query(Usuario).get(usuario_id)
        if not usuario:
            raise HTTPException(401, "Usuario no encontrado")
        _require_admin(db, usuario)
        return RemisionService(db).listar(skip, limit)
    finally:
        db.close()


@router.get("")
async def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: Usuario = Depends(get_current_user),
):
    return await asyncio.to_thread(_listar_remisiones_sync, skip, limit, current_user.id)


@router.get("/{id}")
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    return RemisionService(db).obtener(id)
