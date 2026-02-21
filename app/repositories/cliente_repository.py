"""Repositorio de clientes."""
from app.repositories.base_repository import BaseRepository
from app.models import Cliente


class ClienteRepository(BaseRepository[Cliente]):
    def __init__(self, db):
        super().__init__(Cliente, db)

    def get_by_codigo(self, codigo: str) -> Cliente | None:
        return self.db.query(Cliente).filter(Cliente.codigo == codigo).first()

    def exists_codigo(self, codigo: str, exclude_id: int | None = None) -> bool:
        q = self.db.query(Cliente).filter(Cliente.codigo == codigo)
        if exclude_id:
            q = q.filter(Cliente.id != exclude_id)
        return q.first() is not None
