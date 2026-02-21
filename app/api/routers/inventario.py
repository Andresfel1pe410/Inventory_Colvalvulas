"""Router de inventario - solo lectura y movimientos."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models import Usuario
from app.schemas import Inventario, InventarioResumen, MovimientoInventario, MovimientoInventarioCreate
from app.services.inventario_service import InventarioService
from app.repositories.inventario_repository import InventarioRepository

router = APIRouter(prefix="/inventario", tags=["inventario"])


@router.get("", response_model=list[InventarioResumen])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    pedido_ids: str | None = Query(None, description="IDs de pedidos separados por coma. Si no se envía, usa todos en espera/proceso."),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ids = None
    if pedido_ids:
        try:
            ids = [int(x.strip()) for x in pedido_ids.split(",") if x.strip()]
        except ValueError:
            ids = []
    return InventarioRepository(db).get_all_con_requerido(skip, limit, ids if ids else None)


@router.get("/producto/{producto_id}", response_model=Inventario)
def obtener_por_producto(
    producto_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    inv = InventarioRepository(db).get_by_producto(producto_id)
    if not inv:
        from fastapi import HTTPException
        raise HTTPException(404, "Inventario no encontrado")
    return inv


@router.post("/movimientos", response_model=MovimientoInventario, status_code=201)
def registrar_movimiento(
    data: MovimientoInventarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return InventarioService(db).registrar_movimiento(
        producto_id=data.producto_id,
        tipo=data.tipo,
        cantidad=data.cantidad,
        motivo=data.motivo,
        referencia_tipo=data.referencia_tipo,
        referencia_id=data.referencia_id,
        usuario_id=current_user.id,
    )
