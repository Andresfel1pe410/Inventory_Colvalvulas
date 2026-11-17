"""Router de productos."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user, get_current_roles
from app.api.deps import require_admin, es_vendedor_solo
from app.models import Usuario
from app.repositories.vendedor_lista_repository import VendedorListaRepository
from app.schemas import Producto, ProductoCreate, ProductoUpdate
from app.services.producto_service import ProductoService

router = APIRouter(prefix="/productos", tags=["productos"])


def _listas_vendedor(db: Session, usuario: Usuario, roles: list[str]) -> list[str] | None:
    if es_vendedor_solo(roles):
        return VendedorListaRepository(db).get_listas_by_usuario(usuario.id)
    return None


@router.get("", response_model=list[Producto])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: str | None = Query(None, description="Buscar por código, referencia o material"),
    lista: str | None = Query(None, description="Filtrar productos por lista de precios"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    roles: list[str] = Depends(get_current_roles),
):
    listas = _listas_vendedor(db, current_user, roles)
    return ProductoService(db).listar(skip, limit, search, lista, listas_vendedor=listas)


@router.get("/codigo/{codigo}", response_model=Producto)
def obtener_por_codigo(
    codigo: str,
    lista: str = Query(..., description="Lista de precios (lista_1, lista_2, lista_3, lista_plus, lista_plus_costa)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    roles: list[str] = Depends(get_current_roles),
):
    listas = _listas_vendedor(db, current_user, roles)
    if listas and lista not in listas:
        raise HTTPException(403, "No tiene acceso a esta lista de precios")
    prod = ProductoService(db).obtener_por_codigo_lista(codigo, lista)
    if listas:
        listas_set = set(listas)
        prod.listas_precio = [lp for lp in (prod.listas_precio or []) if lp.lista in listas_set]
    return prod


@router.get("/{id}", response_model=Producto)
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    roles: list[str] = Depends(get_current_roles),
):
    listas = _listas_vendedor(db, current_user, roles)
    return ProductoService(db).obtener(id, listas_vendedor=listas)


@router.post("", response_model=Producto, status_code=201)
def crear(
    data: ProductoCreate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_admin),
):
    return ProductoService(db).crear(data)


@router.put("/{id}", response_model=Producto)
def actualizar(
    id: int,
    data: ProductoUpdate,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_admin),
):
    return ProductoService(db).actualizar(id, data)


@router.delete("/{id}", status_code=204)
def eliminar(
    id: int,
    db: Session = Depends(get_db),
    _admin: Usuario = Depends(require_admin),
):
    ProductoService(db).eliminar(id)
