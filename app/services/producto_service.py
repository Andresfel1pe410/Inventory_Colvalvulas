"""Servicio de productos."""
from app.core.exceptions import NotFoundError, ValidationError
from app.models import Producto, Inventario
from app.repositories.producto_repository import ProductoRepository
from app.schemas import ProductoCreate, ProductoUpdate


class ProductoService:
    def __init__(self, db):
        self.db = db
        self.repo = ProductoRepository(db)

    def listar(
        self,
        skip: int = 0,
        limit: int = 100,
        activos_only: bool = True,
        search: str | None = None,
    ) -> list[Producto]:
        if activos_only:
            return self.repo.list_activos(skip, limit, search)
        return self.repo.list_all(skip, limit, search)

    def obtener(self, id: int) -> Producto:
        p = self.repo.get(id)
        if not p:
            raise NotFoundError("Producto no encontrado")
        return p

    def obtener_por_codigo(self, codigo: str) -> Producto:
        p = self.repo.get_by_codigo(codigo)
        if not p:
            raise NotFoundError("Producto no encontrado")
        return p

    def crear(self, data: ProductoCreate) -> Producto:
        if self.repo.exists_codigo(data.codigo):
            raise ValidationError("Ya existe un producto con ese código")
        d = data.model_dump()
        producto = Producto(**d)
        self.db.add(producto)
        self.db.flush()
        inv = Inventario(producto_id=producto.id, stock_actual=0, stock_minimo=0)
        self.db.add(inv)
        self.db.commit()
        self.db.refresh(producto)
        return producto

    def actualizar(self, id: int, data: ProductoUpdate) -> Producto:
        producto = self.obtener(id)
        attrs = data.model_dump(exclude_unset=True)
        if "codigo" in attrs and attrs["codigo"] != producto.codigo:
            if self.repo.exists_codigo(attrs["codigo"], exclude_id=id):
                raise ValidationError("Ya existe un producto con ese código")
        for k, v in attrs.items():
            setattr(producto, k, v)
        self.db.commit()
        self.db.refresh(producto)
        return producto

    def eliminar(self, id: int) -> None:
        producto = self.obtener(id)
        self.db.delete(producto)
        self.db.commit()
