"""Router de inventario - solo lectura y movimientos."""
from datetime import datetime
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.repositories.movimiento_inventario_repository import MovimientoInventarioRepository
from app.schemas import Inventario, InventarioResumen, InventarioResumenConProducto, MovimientoInventario, MovimientoInventarioCreate, MovimientoInventarioReporte
from app.services.inventario_service import InventarioService
from app.repositories.inventario_repository import InventarioRepository

router = APIRouter(prefix="/inventario", tags=["inventario"])


def _require_admin(db: Session, usuario: Usuario) -> None:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    if "admin" not in roles:
        raise HTTPException(403, "Solo administradores pueden acceder al inventario")


@router.get("", response_model=list[InventarioResumenConProducto])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    pedido_ids: str | None = Query(None, description="IDs de pedidos separados por coma. Si no se envía, usa todos en espera/proceso."),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    ids = None
    if pedido_ids:
        try:
            ids = [int(x.strip()) for x in pedido_ids.split(",") if x.strip()]
        except ValueError:
            ids = []
    return InventarioRepository(db).get_all_con_requerido(skip, limit, ids)


@router.get("/producto/{producto_id}", response_model=Inventario)
def obtener_por_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    inv = InventarioRepository(db).get_by_producto(producto_id)
    if not inv:
        raise HTTPException(404, "Inventario no encontrado")
    return inv


@router.get("/movimientos/entradas", response_model=list[MovimientoInventarioReporte])
def listar_entradas(
    fecha_inicio: str = Query(..., description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: str = Query(..., description="Fecha fin (YYYY-MM-DD)"),
    skip: int = Query(0, ge=0),
    limit: int = Query(5000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    try:
        dt_inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").date()
        dt_fin = datetime.strptime(fecha_fin, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(400, "Formato de fecha inválido. Use YYYY-MM-DD")
    if dt_inicio > dt_fin:
        raise HTTPException(400, "La fecha de inicio debe ser menor o igual a la fecha fin")
    return MovimientoInventarioRepository(db).get_entradas_por_fecha(dt_inicio, dt_fin, skip, limit)


@router.post("/movimientos", response_model=MovimientoInventario, status_code=201)
def registrar_movimiento(
    data: MovimientoInventarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    return InventarioService(db).registrar_movimiento(
        producto_id=data.producto_id,
        tipo=data.tipo,
        cantidad=data.cantidad,
        motivo=data.motivo,
        referencia_tipo=data.referencia_tipo,
        referencia_id=data.referencia_id,
        usuario_id=current_user.id,
    )
