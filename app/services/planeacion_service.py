"""Servicio de Planeación: dependencias de producción, empleados asignados
(editable) y tareas por empleado dentro de cada dependencia."""
from app.core.exceptions import NotFoundError, ValidationError
from app.repositories.empleado_repository import EmpleadoRepository
from app.repositories.planeacion_repository import PlaneacionRepository
from app.schemas import ESTADOS_TAREA


class PlaneacionService:
    def __init__(self, db):
        self.db = db
        self.repo = PlaneacionRepository(db)
        self.emp_repo = EmpleadoRepository(db)

    def _validar_empleado_activo(self, empleado_id: int):
        empleado = self.emp_repo.get(empleado_id)
        if not empleado or not empleado.activo:
            raise ValidationError(f"El empleado {empleado_id} no existe o no está activo")
        return empleado

    # ---------- Dependencias ----------
    def listar(self, skip: int = 0, limit: int = 100) -> list[dict]:
        dependencias = self.repo.get_all(skip, limit)
        conteos = self.repo.contar_empleados([d.id for d in dependencias])
        return [
            {
                "id": d.id,
                "nombre": d.nombre,
                "created_at": d.created_at,
                "updated_at": d.updated_at,
                "empleados_count": conteos.get(d.id, 0),
            }
            for d in dependencias
        ]

    def crear_dependencia(self, nombre: str, empleado_ids: list[int], commit: bool = True):
        if not nombre or not nombre.strip():
            raise ValidationError("El nombre de la dependencia es obligatorio")

        for empleado_id in set(empleado_ids):
            self._validar_empleado_activo(empleado_id)

        dependencia = self.repo.crear(nombre.strip())
        for empleado_id in set(empleado_ids):
            self.repo.agregar_empleado(dependencia.id, empleado_id)

        if commit:
            self.db.commit()
            self.db.refresh(dependencia)
        return dependencia

    def obtener_detalle(self, dependencia_id: int) -> dict:
        dependencia = self.repo.get(dependencia_id)
        if not dependencia:
            raise NotFoundError("Dependencia no encontrada")

        asignaciones = self.repo.get_empleados_asignados(dependencia_id)
        tareas = self.repo.get_tareas_de_dependencia(dependencia_id)

        tareas_por_empleado: dict[int, list] = {}
        for tarea in tareas:
            tareas_por_empleado.setdefault(tarea.empleado_id, []).append(tarea)

        empleados = [
            {
                "empleado_id": asignacion.empleado_id,
                "nombre": asignacion.empleado.nombre,
                "cargo": asignacion.empleado.cargo,
                "tareas": tareas_por_empleado.get(asignacion.empleado_id, []),
            }
            for asignacion in asignaciones
        ]

        return {
            "id": dependencia.id,
            "nombre": dependencia.nombre,
            "created_at": dependencia.created_at,
            "updated_at": dependencia.updated_at,
            "empleados": empleados,
        }

    # ---------- Empleados asignados ----------
    def agregar_empleado(self, dependencia_id: int, empleado_id: int, commit: bool = True):
        if not self.repo.get(dependencia_id):
            raise NotFoundError("Dependencia no encontrada")
        self._validar_empleado_activo(empleado_id)
        if self.repo.empleado_asignado(dependencia_id, empleado_id):
            raise ValidationError("El empleado ya está asignado a esta dependencia")

        asignacion = self.repo.agregar_empleado(dependencia_id, empleado_id)
        if commit:
            self.db.commit()
        return asignacion

    def quitar_empleado(self, dependencia_id: int, empleado_id: int, commit: bool = True):
        if not self.repo.get(dependencia_id):
            raise NotFoundError("Dependencia no encontrada")
        if not self.repo.quitar_empleado(dependencia_id, empleado_id):
            raise NotFoundError("El empleado no está asignado a esta dependencia")
        if commit:
            self.db.commit()

    # ---------- Tareas ----------
    def crear_tarea(self, dependencia_id: int, empleado_id: int, descripcion: str, commit: bool = True):
        if not self.repo.get(dependencia_id):
            raise NotFoundError("Dependencia no encontrada")
        if not descripcion or not descripcion.strip():
            raise ValidationError("La descripción de la tarea es obligatoria")
        if not self.repo.empleado_asignado(dependencia_id, empleado_id):
            raise ValidationError("El empleado no está asignado a esta dependencia")

        tarea = self.repo.crear_tarea(dependencia_id, empleado_id, descripcion.strip())
        if commit:
            self.db.commit()
            self.db.refresh(tarea)
        return tarea

    def actualizar_estado_tarea(self, dependencia_id: int, tarea_id: int, estado: str, commit: bool = True):
        if estado not in ESTADOS_TAREA:
            raise ValidationError(f"Estado inválido. Válidos: {ESTADOS_TAREA}")

        tarea = self.repo.get_tarea(tarea_id)
        if not tarea or tarea.dependencia_id != dependencia_id:
            raise NotFoundError("Tarea no encontrada en esta dependencia")

        tarea = self.repo.actualizar_estado_tarea(tarea, estado)
        if commit:
            self.db.commit()
            self.db.refresh(tarea)
        return tarea
