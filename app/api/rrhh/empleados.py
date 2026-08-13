"""Router de empleados."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.api.deps import require_admin
from app.models import Usuario
from app.schemas import Empleado, EmpleadoCreate, EmpleadoUpdate, EmpleadoAccesoCreate, EmpleadoAccesoEstado
from app.services.empleado_service import EmpleadoService
from app.services.empleado_acceso_service import EmpleadoAccesoService

router = APIRouter(prefix="/empleados", tags=["empleados"])


@router.get("", response_model=list[Empleado])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    search: str | None = Query(None, description="Buscar por nombre o documento"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return EmpleadoService(db).listar(skip, limit, search)


@router.get("/{id}", response_model=Empleado)
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return EmpleadoService(db).obtener(id)


@router.post("", response_model=Empleado, status_code=201)
def crear(
    data: EmpleadoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return EmpleadoService(db).crear(data)


@router.put("/{id}", response_model=Empleado)
def actualizar(
    id: int,
    data: EmpleadoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return EmpleadoService(db).actualizar(id, data)


@router.delete("/{id}", status_code=204)
def eliminar(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    """Baja lógica: desactiva al empleado (no borra su historial de asistencia)."""
    EmpleadoService(db).eliminar(id)


@router.get("/{id}/acceso", response_model=EmpleadoAccesoEstado)
def obtener_acceso(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return EmpleadoAccesoService(db).obtener_estado(id)


@router.post("/{id}/acceso", response_model=EmpleadoAccesoEstado, status_code=201)
def crear_acceso(
    id: int,
    data: EmpleadoAccesoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    """Crea el login (Supabase Auth) del empleado con el correo/clave que
    define el admin, y lo deja con rol 'empleado' listo para entrar a
    Planeación → Mis tareas."""
    return EmpleadoAccesoService(db).crear_acceso(id, data.email, data.password)
