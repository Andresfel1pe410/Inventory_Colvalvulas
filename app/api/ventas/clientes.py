"""Router de clientes - CRUD sin eliminación."""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.api.deps import require_admin
from app.models import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas import Cliente, ClienteCreate, ClienteUpdate
from app.services.cliente_service import ClienteService

router = APIRouter(prefix="/clientes", tags=["clientes"])


def _check_actualizar_permission(
    db: Session, usuario: Usuario, data: ClienteUpdate, cliente_actual
) -> None:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    is_admin = "admin" in roles
    is_auditor = "auditor_contable" in roles
    if not is_admin and not is_auditor:
        raise HTTPException(403, "Solo administradores pueden realizar esta acción")

    attrs = data.model_dump(exclude_unset=True)
    cambios = {k for k, v in attrs.items() if getattr(cliente_actual, k) != v}

    if not is_admin and (cambios - {"estado_cliente"}):
        raise HTTPException(403, "Auditor Contable solo puede modificar Estado Cliente")
    if not is_auditor and "estado_cliente" in cambios:
        raise HTTPException(403, "Solo Auditor Contable puede modificar Estado Cliente")


@router.get("", response_model=list[Cliente])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    search: str | None = Query(None, description="Buscar por número de documento o razón social"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Vendedor puede listar clientes (para seleccionar al crear pedidos); admin para crear/editar/eliminar
    return ClienteService(db).listar(skip, limit, search)


@router.get("/{id}", response_model=Cliente)
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return ClienteService(db).obtener(id)


@router.post("", response_model=Cliente, status_code=201)
def crear(
    data: ClienteCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return ClienteService(db).crear(data)


@router.put("/{id}", response_model=Cliente)
def actualizar(
    id: int,
    data: ClienteUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    service = ClienteService(db)
    cliente_actual = service.obtener(id)
    _check_actualizar_permission(db, current_user, data, cliente_actual)
    return service.actualizar(id, data)


@router.delete("/{id}", status_code=204)
def eliminar(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    ClienteService(db).eliminar(id)
