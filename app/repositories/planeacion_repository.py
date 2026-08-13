"""Repositorio de Planeación: dependencias, empleados asignados y tareas."""
from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload

from app.models import Dependencia, DependenciaEmpleado, Tarea


class PlaneacionRepository:
    def __init__(self, db: Session):
        self.db = db

    # ---------- Dependencias ----------
    def get_all(self, skip: int = 0, limit: int = 100) -> list[Dependencia]:
        return (
            self.db.query(Dependencia)
            .order_by(desc(Dependencia.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get(self, dependencia_id: int) -> Dependencia | None:
        return self.db.query(Dependencia).filter_by(id=dependencia_id).first()

    def crear(self, nombre: str) -> Dependencia:
        dependencia = Dependencia(nombre=nombre)
        self.db.add(dependencia)
        self.db.flush()
        return dependencia

    def contar_empleados(self, dependencia_ids: list[int]) -> dict[int, int]:
        if not dependencia_ids:
            return {}
        filas = (
            self.db.query(DependenciaEmpleado.dependencia_id, func.count(DependenciaEmpleado.id))
            .filter(DependenciaEmpleado.dependencia_id.in_(dependencia_ids))
            .group_by(DependenciaEmpleado.dependencia_id)
            .all()
        )
        return {dependencia_id: total for dependencia_id, total in filas}

    # ---------- Empleados asignados ----------
    def empleado_asignado(self, dependencia_id: int, empleado_id: int) -> bool:
        return (
            self.db.query(DependenciaEmpleado)
            .filter_by(dependencia_id=dependencia_id, empleado_id=empleado_id)
            .first()
            is not None
        )

    def agregar_empleado(self, dependencia_id: int, empleado_id: int) -> DependenciaEmpleado:
        asignacion = DependenciaEmpleado(dependencia_id=dependencia_id, empleado_id=empleado_id)
        self.db.add(asignacion)
        self.db.flush()
        return asignacion

    def quitar_empleado(self, dependencia_id: int, empleado_id: int) -> bool:
        asignacion = (
            self.db.query(DependenciaEmpleado)
            .filter_by(dependencia_id=dependencia_id, empleado_id=empleado_id)
            .first()
        )
        if not asignacion:
            return False
        self.db.delete(asignacion)
        self.db.flush()
        return True

    def get_empleados_asignados(self, dependencia_id: int) -> list[DependenciaEmpleado]:
        """Asignaciones de la dependencia, con el empleado precargado (evita N+1)."""
        return (
            self.db.query(DependenciaEmpleado)
            .filter_by(dependencia_id=dependencia_id)
            .options(joinedload(DependenciaEmpleado.empleado))
            .order_by(DependenciaEmpleado.id)
            .all()
        )

    def get_tareas_de_dependencia(self, dependencia_id: int) -> list[Tarea]:
        return (
            self.db.query(Tarea)
            .filter_by(dependencia_id=dependencia_id)
            .order_by(Tarea.created_at)
            .all()
        )

    def get_tareas_de_empleado(self, empleado_id: int) -> list[Tarea]:
        """Tareas de un empleado a través de TODAS sus dependencias (para
        'mis tareas') -- con la dependencia precargada para no hacer N+1."""
        return (
            self.db.query(Tarea)
            .filter_by(empleado_id=empleado_id)
            .options(joinedload(Tarea.dependencia))
            .order_by(Tarea.created_at)
            .all()
        )

    # ---------- Tareas ----------
    def crear_tarea(self, dependencia_id: int, empleado_id: int, descripcion: str, cantidad: int = 1) -> Tarea:
        tarea = Tarea(
            dependencia_id=dependencia_id,
            empleado_id=empleado_id,
            descripcion=descripcion,
            cantidad=cantidad,
        )
        self.db.add(tarea)
        self.db.flush()
        return tarea

    def get_tarea(self, tarea_id: int) -> Tarea | None:
        return self.db.query(Tarea).filter_by(id=tarea_id).first()

    def actualizar_tarea(self, tarea: Tarea, estado: str, realizado: int | None = None) -> Tarea:
        tarea.estado = estado
        if realizado is not None:
            tarea.realizado = realizado
        self.db.flush()
        return tarea

    def eliminar_tarea(self, tarea: Tarea) -> None:
        self.db.delete(tarea)
        self.db.flush()
