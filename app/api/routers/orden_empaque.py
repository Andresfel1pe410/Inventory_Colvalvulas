"""Router de órdenes de empaque."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models import Usuario
from app.schemas import OrdenEmpaque, OrdenEmpaqueConDetalles, OrdenEmpaqueCreate
from app.services.orden_empaque_service import OrdenEmpaqueService

router = APIRouter(prefix="/orden-empaque", tags=["orden-empaque"])


@router.get("", response_model=list[OrdenEmpaque])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return OrdenEmpaqueService(db).listar(skip, limit)


@router.get("/{id}", response_model=OrdenEmpaqueConDetalles)
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return OrdenEmpaqueService(db).obtener(id)


@router.post("", response_model=OrdenEmpaqueConDetalles, status_code=201)
def crear(
    data: OrdenEmpaqueCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return OrdenEmpaqueService(db).crear(data, current_user.id)


@router.post("/{id}/cerrar", response_model=OrdenEmpaqueConDetalles)
def cerrar(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return OrdenEmpaqueService(db).cerrar(id, current_user.id)
