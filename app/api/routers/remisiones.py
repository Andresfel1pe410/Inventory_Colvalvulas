"""Router de remisiones - genera movimiento_inventario al crear."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models import Usuario
from app.schemas import RemisionCreate, Remision
from app.services.remision_service import RemisionService

router = APIRouter(prefix="/remisiones", tags=["remisiones"])


@router.get("")
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return RemisionService(db).listar(skip, limit)


@router.get("/{id}")
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return RemisionService(db).obtener(id)


@router.post("", response_model=Remision, status_code=201)
def generar(
    data: RemisionCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return RemisionService(db).generar(data, current_user.id)
