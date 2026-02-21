"""Repositorio de productos."""
from sqlalchemy import or_
from app.repositories.base_repository import BaseRepository
from app.models import Producto


class ProductoRepository(BaseRepository[Producto]):
    def __init__(self, db):
        super().__init__(Producto, db)

    def get_by_codigo(self, codigo: str) -> Producto | None:
        return self.db.query(Producto).filter(Producto.codigo == codigo).first()

    def exists_codigo(self, codigo: str, exclude_id: int | None = None) -> bool:
        q = self.db.query(Producto).filter(Producto.codigo == codigo)
        if exclude_id:
            q = q.filter(Producto.id != exclude_id)
        return q.first() is not None

    def list_activos(self, skip: int = 0, limit: int = 100, search: str | None = None):
        return self.list_all(skip, limit, search)

    def list_all(self, skip: int = 0, limit: int = 100, search: str | None = None):
        q = self.db.query(Producto)
        if search and search.strip():
            term = f"%{search.strip()}%"
            q = q.filter(
                or_(
                    Producto.codigo.ilike(term),
                    Producto.referencia.ilike(term),
                    Producto.material.ilike(term),
                )
            )
        return q.offset(skip).limit(limit).all()
