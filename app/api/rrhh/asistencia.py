"""Router de asistencia (uso administrativo, requiere sesión)."""
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth.jwt import get_current_user
from app.api.deps import require_admin
from app.models import Usuario
from app.schemas import EventoAsistencia, EventoAsistenciaCreate, EventoAsistenciaReporte, EmpleadoEstadoHoy
from app.services.asistencia_service import AsistenciaService

router = APIRouter(prefix="/asistencia", tags=["asistencia"])


@router.get("", response_model=list[EventoAsistenciaReporte])
def listar(
    empleado_id: int | None = Query(None),
    fecha_inicio: date | None = Query(None),
    fecha_fin: date | None = Query(None),
    tipo_evento: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(5000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return AsistenciaService(db).reporte(empleado_id, fecha_inicio, fecha_fin, tipo_evento, skip, limit)


@router.post("", response_model=EventoAsistencia, status_code=201)
def registrar(
    data: EventoAsistenciaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    """Registro manual de un evento (corrección/carga administrativa)."""
    return AsistenciaService(db).registrar_evento(data.empleado_id, data.tipo_evento, data.device_id)


@router.get("/hoy", response_model=list[EmpleadoEstadoHoy])
def hoy(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return AsistenciaService(db).estado_hoy()


@router.get("/reporte", response_model=list[EventoAsistenciaReporte])
def reporte(
    empleado_id: int | None = Query(None),
    fecha_inicio: date | None = Query(None),
    fecha_fin: date | None = Query(None),
    tipo_evento: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(5000, ge=1, le=10000),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    return AsistenciaService(db).reporte(empleado_id, fecha_inicio, fecha_fin, tipo_evento, skip, limit)
