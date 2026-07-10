"""Repositorio de empleados."""
from sqlalchemy import or_
from app.repositories.base_repository import BaseRepository
from app.models import Empleado


class EmpleadoRepository(BaseRepository[Empleado]):
    def __init__(self, db):
        super().__init__(Empleado, db)

    def listar(self, skip: int = 0, limit: int = 1000, search: str | None = None):
        q = self.db.query(Empleado)
        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.filter(or_(Empleado.nombre.ilike(term), Empleado.documento.ilike(term)))
        return q.order_by(Empleado.nombre).offset(skip).limit(limit).all()

    def exists_documento(self, documento: str, exclude_id: int | None = None) -> bool:
        q = self.db.query(Empleado).filter(Empleado.documento == documento)
        if exclude_id:
            q = q.filter(Empleado.id != exclude_id)
        return q.first() is not None

    def exists_fingerprint_id(self, fingerprint_id: int, exclude_id: int | None = None) -> bool:
        q = self.db.query(Empleado).filter(Empleado.fingerprint_id == fingerprint_id)
        if exclude_id:
            q = q.filter(Empleado.id != exclude_id)
        return q.first() is not None

    def get_by_fingerprint_id(self, fingerprint_id: int) -> Empleado | None:
        return self.db.query(Empleado).filter(Empleado.fingerprint_id == fingerprint_id).first()

    def listar_activos_con_fingerprint(self) -> list[Empleado]:
        return (
            self.db.query(Empleado)
            .filter(Empleado.activo.is_(True), Empleado.fingerprint_id.isnot(None))
            .all()
        )
