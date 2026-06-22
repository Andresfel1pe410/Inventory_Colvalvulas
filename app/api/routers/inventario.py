from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.exceptions import NotFoundError
from app.models import Usuario
from app.repositories.inventario_repository import InventarioRepository
from app.schemas import MovimientoInventarioCreate

router = APIRouter()

@router.post("/movimientos", response_model=MovimientoInventario, status_code=201)
def registrar_movimiento(
    data: MovimientoInventarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    repo = InventarioRepository(db)
    try:
        movimiento = repo.registrar_movimiento(data.producto_id, data.tipo, data.cantidad, current_user.email)
        return movimiento
    except NotFoundError as e:
        logger.error(f"NotFoundError: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
