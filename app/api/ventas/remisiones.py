"""Router de remisiones - listado y detalle. Las remisiones se generan al marcar pedidos como enviado."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.api.deps import require_admin
from app.models import Usuario
from app.services.remision_service import RemisionService

router = APIRouter(prefix="/remisiones", tags=["remisiones"])


@router.get("")
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return RemisionService(db).listar(skip, limit)


@router.get("/{id}")
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return RemisionService(db).obtener(id)
