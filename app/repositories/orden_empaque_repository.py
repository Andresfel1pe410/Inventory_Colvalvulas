"""Repositorio de órdenes de empaque."""
from sqlalchemy import func
from app.repositories.base_repository import BaseRepository
from app.models import OrdenEmpaque


class OrdenEmpaqueRepository(BaseRepository[OrdenEmpaque]):
    def __init__(self, db):
        super().__init__(OrdenEmpaque, db)

    def get_with_detalles(self, orden_id: int) -> OrdenEmpaque | None:
        return (
            self.db.query(OrdenEmpaque)
            .filter(OrdenEmpaque.id == orden_id)
            .first()
        )

    def generar_numero(self) -> str:
        max_id = self.db.query(func.max(OrdenEmpaque.id)).scalar() or 0
        return f"EMP-{max_id + 1:06d}"
