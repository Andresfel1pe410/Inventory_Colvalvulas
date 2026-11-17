"""Router de Planeación (dependencias, empleados asignados y tareas).
Solo admin -- a diferencia de inventario-proceso (admin+almacén)."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.api.deps import require_admin
from app.models import Usuario
from app.schemas import (
    Dependencia,
    DependenciaCreate,
    DependenciaDetalle,
    DependenciaEmpleadoAdd,
    DependenciaListItem,
    Tarea,
    TareaCreate,
    TareaUpdate,
)
from app.services.planeacion_service import PlaneacionService

router = APIRouter(prefix="/planeacion", tags=["planeacion"])


@router.get("/dependencias", response_model=list[DependenciaListItem])
def listar_dependencias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return PlaneacionService(db).listar(skip, limit)


@router.post("/dependencias", response_model=Dependencia, status_code=201)
def crear_dependencia(
    data: DependenciaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return PlaneacionService(db).crear_dependencia(data.nombre, data.empleado_ids)


@router.get("/dependencias/{dependencia_id}", response_model=DependenciaDetalle)
def obtener_dependencia(
    dependencia_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return PlaneacionService(db).obtener_detalle(dependencia_id)


@router.post("/dependencias/{dependencia_id}/empleados", response_model=DependenciaDetalle)
def agregar_empleado(
    dependencia_id: int,
    data: DependenciaEmpleadoAdd,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    service = PlaneacionService(db)
    service.agregar_empleado(dependencia_id, data.empleado_id)
    return service.obtener_detalle(dependencia_id)


@router.delete("/dependencias/{dependencia_id}/empleados/{empleado_id}", response_model=DependenciaDetalle)
def quitar_empleado(
    dependencia_id: int,
    empleado_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    service = PlaneacionService(db)
    service.quitar_empleado(dependencia_id, empleado_id)
    return service.obtener_detalle(dependencia_id)


@router.post("/dependencias/{dependencia_id}/tareas", response_model=Tarea, status_code=201)
def crear_tarea(
    dependencia_id: int,
    data: TareaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return PlaneacionService(db).crear_tarea(dependencia_id, data.empleado_id, data.descripcion, data.cantidad)


@router.patch("/dependencias/{dependencia_id}/tareas/{tarea_id}", response_model=Tarea)
def actualizar_estado_tarea(
    dependencia_id: int,
    tarea_id: int,
    data: TareaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return PlaneacionService(db).actualizar_estado_tarea(dependencia_id, tarea_id, data.estado, data.realizado)


@router.delete("/dependencias/{dependencia_id}/tareas/{tarea_id}", status_code=204)
def eliminar_tarea(
    dependencia_id: int,
    tarea_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    PlaneacionService(db).eliminar_tarea(dependencia_id, tarea_id)
