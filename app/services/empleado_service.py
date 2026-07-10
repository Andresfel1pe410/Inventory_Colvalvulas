"""Servicio de empleados."""
from app.core.exceptions import NotFoundError, ValidationError
from app.models import Empleado
from app.repositories.empleado_repository import EmpleadoRepository
from app.schemas import EmpleadoCreate, EmpleadoUpdate


class EmpleadoService:
    def __init__(self, db):
        self.db = db
        self.repo = EmpleadoRepository(db)

    def listar(self, skip: int = 0, limit: int = 1000, search: str | None = None) -> list[Empleado]:
        return self.repo.listar(skip, limit, search)

    def obtener(self, id: int) -> Empleado:
        e = self.repo.get(id)
        if not e:
            raise NotFoundError("Empleado no encontrado")
        return e

    def crear(self, data: EmpleadoCreate) -> Empleado:
        if self.repo.exists_documento(data.documento):
            raise ValidationError(f"Ya existe un empleado con documento {data.documento}")
        if data.fingerprint_id is not None and self.repo.exists_fingerprint_id(data.fingerprint_id):
            raise ValidationError(f"Ya existe un empleado con fingerprint_id {data.fingerprint_id}")
        empleado = Empleado(**data.model_dump())
        self.db.add(empleado)
        self.db.commit()
        self.db.refresh(empleado)
        return empleado

    def actualizar(self, id: int, data: EmpleadoUpdate) -> Empleado:
        empleado = self.obtener(id)
        attrs = data.model_dump(exclude_unset=True)
        if "documento" in attrs and attrs["documento"] != empleado.documento:
            if self.repo.exists_documento(attrs["documento"], exclude_id=id):
                raise ValidationError(f"Ya existe un empleado con documento {attrs['documento']}")
        if "fingerprint_id" in attrs and attrs["fingerprint_id"] is not None and attrs["fingerprint_id"] != empleado.fingerprint_id:
            if self.repo.exists_fingerprint_id(attrs["fingerprint_id"], exclude_id=id):
                raise ValidationError(f"Ya existe un empleado con fingerprint_id {attrs['fingerprint_id']}")
        for k, v in attrs.items():
            setattr(empleado, k, v)
        self.db.commit()
        self.db.refresh(empleado)
        return empleado

    def eliminar(self, id: int) -> None:
        """Baja lógica: desactiva al empleado en vez de borrar la fila, para
        conservar su historial de asistencia."""
        empleado = self.obtener(id)
        empleado.activo = False
        self.db.commit()
