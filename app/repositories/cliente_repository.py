"""Repositorio de clientes."""
from sqlalchemy import or_
from app.repositories.base_repository import BaseRepository
from app.models import Cliente


class ClienteRepository(BaseRepository[Cliente]):
    def __init__(self, db):
        super().__init__(Cliente, db)

    def listar(self, skip: int = 0, limit: int = 100, search: str | None = None):
        q = self.db.query(Cliente)
        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.filter(
                or_(
                    Cliente.numero_identificacion.ilike(term),
                    Cliente.razon_social.ilike(term),
                )
            )
        return q.offset(skip).limit(limit).all()

    def exists_documento(
        self, tipo_documento: str, numero_identificacion: str, exclude_id: int | None = None
    ) -> bool:
        q = self.db.query(Cliente).filter(
            Cliente.tipo_documento == tipo_documento,
            Cliente.numero_identificacion == numero_identificacion,
        )
        if exclude_id:
            q = q.filter(Cliente.id != exclude_id)
        return q.first() is not None
