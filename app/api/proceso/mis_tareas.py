"""Router de 'Mis tareas': autoservicio para el rol 'empleado'. Separado
de planeacion.py (admin-only) a propósito -- ver CLAUDE.md de este paquete."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.api.deps import require_roles
from app.models import Usuario
from app.schemas import TareaConDependencia, TareaUpdate
from app.services.planeacion_service import PlaneacionService

router = APIRouter(prefix="/planeacion", tags=["planeacion"])


def _empleado_id_de(usuario: Usuario) -> int:
    if usuario.empleado_id is None:
        raise HTTPException(status_code=404, detail="Tu usuario no tiene un empleado vinculado")
    return usuario.empleado_id


@router.get("/mis-tareas", response_model=list[TareaConDependencia])
def listar_mis_tareas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _empleado: Usuario = Depends(require_roles("empleado")),
):
    return PlaneacionService(db).listar_tareas_de_empleado(_empleado_id_de(current_user))


@router.patch("/mis-tareas/{tarea_id}", response_model=TareaConDependencia)
def actualizar_mi_tarea(
    tarea_id: int,
    data: TareaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _empleado: Usuario = Depends(require_roles("empleado")),
):
    empleado_id = _empleado_id_de(current_user)
    return PlaneacionService(db).actualizar_estado_tarea_de_empleado(
        empleado_id, tarea_id, data.estado, data.realizado
    )
