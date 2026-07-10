"""Repositorio de eventos de asistencia."""
from datetime import date, datetime

from app.models import EventoAsistencia, Empleado


class AsistenciaRepository:
    def __init__(self, db):
        self.db = db

    def crear_evento(
        self, empleado_id: int, tipo_evento: str, device_id: int | None = None
    ) -> EventoAsistencia:
        evento = EventoAsistencia(
            empleado_id=empleado_id,
            tipo_evento=tipo_evento,
            device_id=device_id,
        )
        self.db.add(evento)
        self.db.flush()
        return evento

    def get_ultimo_evento_en_rango(
        self, empleado_id: int, dt_inicio: datetime, dt_fin: datetime
    ) -> EventoAsistencia | None:
        return (
            self.db.query(EventoAsistencia)
            .filter(
                EventoAsistencia.empleado_id == empleado_id,
                EventoAsistencia.timestamp >= dt_inicio,
                EventoAsistencia.timestamp <= dt_fin,
            )
            .order_by(EventoAsistencia.timestamp.desc(), EventoAsistencia.id.desc())
            .first()
        )

    def get_eventos_en_rango(self, dt_inicio: datetime, dt_fin: datetime) -> list[EventoAsistencia]:
        return (
            self.db.query(EventoAsistencia)
            .filter(
                EventoAsistencia.timestamp >= dt_inicio,
                EventoAsistencia.timestamp <= dt_fin,
            )
            .order_by(EventoAsistencia.timestamp)
            .all()
        )

    def listar(
        self,
        empleado_id: int | None = None,
        fecha_inicio: date | None = None,
        fecha_fin: date | None = None,
        tipo_evento: str | None = None,
        skip: int = 0,
        limit: int = 5000,
    ) -> list[dict]:
        """Lista eventos de asistencia con nombre/cargo del empleado ya unidos."""
        q = self.db.query(
            EventoAsistencia.id,
            EventoAsistencia.empleado_id,
            Empleado.nombre.label("empleado_nombre"),
            Empleado.cargo,
            EventoAsistencia.tipo_evento,
            EventoAsistencia.timestamp,
            EventoAsistencia.device_id,
        ).join(Empleado, Empleado.id == EventoAsistencia.empleado_id)

        if empleado_id is not None:
            q = q.filter(EventoAsistencia.empleado_id == empleado_id)
        if tipo_evento is not None:
            q = q.filter(EventoAsistencia.tipo_evento == tipo_evento)
        if fecha_inicio is not None:
            q = q.filter(EventoAsistencia.timestamp >= datetime.combine(fecha_inicio, datetime.min.time()))
        if fecha_fin is not None:
            q = q.filter(EventoAsistencia.timestamp <= datetime.combine(fecha_fin, datetime.max.time()))

        rows = (
            q.order_by(EventoAsistencia.timestamp.desc(), EventoAsistencia.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return [
            {
                "id": r.id,
                "empleado_id": r.empleado_id,
                "empleado_nombre": r.empleado_nombre,
                "cargo": r.cargo,
                "tipo_evento": r.tipo_evento,
                "timestamp": r.timestamp,
                "device_id": r.device_id,
            }
            for r in rows
        ]
