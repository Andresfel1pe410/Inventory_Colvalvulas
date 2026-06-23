"""Router de inventario de proceso."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.models import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas import (
    InventarioProceso,
    MovimientoInventarioProcesoCreate,
    MovimientoInventarioProceso,
)
from app.services.inventario_proceso_service import InventarioProcesoService
from app.repositories.inventario_proceso_repository import InventarioProcesoRepository

router = APIRouter(prefix="/inventario-proceso", tags=["inventario-proceso"])


def _require_admin_or_almacen(db: Session, usuario: Usuario) -> None:
    """Requiere que el usuario sea admin o almacen."""
    roles = UsuarioRepository(db).get_roles(usuario.id)
    if "admin" not in roles and "almacen" not in roles:
        raise HTTPException(403, "Solo administradores y almacenes pueden acceder al inventario de proceso")


@router.get("", response_model=list[InventarioProceso])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin_or_almacen(db, current_user)
    return InventarioProcesoRepository(db).get_all(skip, limit)


@router.post("/movimientos", response_model=MovimientoInventarioProceso, status_code=201)
def registrar_movimiento(
    data: MovimientoInventarioProcesoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin_or_almacen(db, current_user)
    return InventarioProcesoService(db).registrar_movimiento(
        referencia=data.referencia,
        material=data.material,
        tipo=data.tipo,
        cantidad=data.cantidad,
        usuario_realizo=data.usuario_realizo,
    )


@router.get("/movimientos", response_model=list[MovimientoInventarioProceso])
def listar_movimientos(
    inventario_proceso_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin_or_almacen(db, current_user)
    return InventarioProcesoRepository(db).get_movimientos(inventario_proceso_id, skip, limit)
