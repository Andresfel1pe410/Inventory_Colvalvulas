"""Repositorio de clientes."""
from app.repositories.base_repository import BaseRepository
from app.models import Cliente


class ClienteRepository(BaseRepository[Cliente]):
    def __init__(self, db):
        super().__init__(Cliente, db)

    def get_by_nit(self, nit: str) -> Cliente | None:
        return self.db.query(Cliente).filter(Cliente.nit == nit).first()

    def exists_nit(self, nit: str, exclude_id: int | None = None) -> bool:
        q = self.db.query(Cliente).filter(Cliente.nit == nit)
        if exclude_id:
            q = q.filter(Cliente.id != exclude_id)
        return q.first() is not None
