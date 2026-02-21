"""Router de productos - CRUD sin eliminación."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models import Usuario
from app.schemas import Producto, ProductoCreate, ProductoUpdate
from app.services.producto_service import ProductoService

router = APIRouter(prefix="/productos", tags=["productos"])


@router.get("", response_model=list[Producto])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    activos_only: bool = Query(True),
    search: str | None = Query(None, description="Buscar por código, referencia o material"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return ProductoService(db).listar(skip, limit, activos_only, search)


@router.get("/codigo/{codigo}", response_model=Producto)
def obtener_por_codigo(
    codigo: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return ProductoService(db).obtener_por_codigo(codigo)


@router.get("/{id}", response_model=Producto)
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return ProductoService(db).obtener(id)


@router.post("", response_model=Producto, status_code=201)
def crear(
    data: ProductoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return ProductoService(db).crear(data)


@router.put("/{id}", response_model=Producto)
def actualizar(
    id: int,
    data: ProductoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return ProductoService(db).actualizar(id, data)


@router.delete("/{id}", status_code=204)
def eliminar(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    ProductoService(db).eliminar(id)
