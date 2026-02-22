"""Repositorio de productos."""
from sqlalchemy import or_
from sqlalchemy.orm import joinedload
from app.repositories.base_repository import BaseRepository
from app.models import Producto, ProductoListaPrecio


class ProductoRepository(BaseRepository[Producto]):
    def __init__(self, db):
        super().__init__(Producto, db)

    def get_with_listas(self, id: int) -> Producto | None:
        return (
            self.db.query(Producto)
            .options(joinedload(Producto.listas_precio))
            .filter(Producto.id == id)
            .first()
        )

    def get_by_codigo_lista(self, codigo: str, lista: str) -> Producto | None:
        plp = (
            self.db.query(ProductoListaPrecio)
            .filter(
                ProductoListaPrecio.lista == lista,
                ProductoListaPrecio.codigo == codigo,
            )
            .first()
        )
        return plp.producto if plp else None

    def exists_codigo_en_lista(
        self, codigo: str, lista: str, exclude_producto_id: int | None = None
    ) -> bool:
        q = self.db.query(ProductoListaPrecio).filter(
            ProductoListaPrecio.lista == lista,
            ProductoListaPrecio.codigo == codigo,
        )
        if exclude_producto_id:
            q = q.filter(ProductoListaPrecio.producto_id != exclude_producto_id)
        return q.first() is not None

    def get_precio_lista(self, producto_id: int, lista: str) -> float | None:
        plp = (
            self.db.query(ProductoListaPrecio)
            .filter(
                ProductoListaPrecio.producto_id == producto_id,
                ProductoListaPrecio.lista == lista,
            )
            .first()
        )
        return float(plp.precio) if plp else None

    def list_all(
        self,
        skip: int = 0,
        limit: int = 100,
        search: str | None = None,
        lista: str | None = None,
        listas: list[str] | None = None,
    ):
        q = self.db.query(Producto).options(joinedload(Producto.listas_precio))
        if listas:
            q = q.join(Producto.listas_precio).filter(ProductoListaPrecio.lista.in_(listas))
        elif lista:
            q = q.join(Producto.listas_precio).filter(ProductoListaPrecio.lista == lista)
        if search and search.strip():
            term = f"%{search.strip()}%"
            if lista or listas:
                q = q.filter(
                    or_(
                        ProductoListaPrecio.codigo.ilike(term),
                        Producto.referencia.ilike(term),
                        Producto.material.ilike(term),
                    )
                )
            else:
                q = q.outerjoin(ProductoListaPrecio).filter(
                    or_(
                        ProductoListaPrecio.codigo.ilike(term),
                        Producto.referencia.ilike(term),
                        Producto.material.ilike(term),
                    )
                )
        q = q.distinct()
        return q.offset(skip).limit(limit).all()
