"""Servicio de productos."""
from app.core.exceptions import NotFoundError, ValidationError
from app.models import Producto, ProductoListaPrecio, Inventario
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
        search: str | None = None,
        lista: str | None = None,
        listas_vendedor: list[str] | None = None,
    ) -> list[Producto]:
        productos = self.repo.list_all(skip, limit, search, lista)
        if listas_vendedor and len(listas_vendedor) > 0:
            listas_set = set(listas_vendedor)
            for p in productos:
                p.listas_precio = [lp for lp in (p.listas_precio or []) if lp.lista in listas_set]
        return productos

    def obtener(
        self, id: int, listas_vendedor: list[str] | None = None
    ) -> Producto:
        p = self.repo.get_with_listas(id)
        if not p:
            raise NotFoundError("Producto no encontrado")
        if listas_vendedor and len(listas_vendedor) > 0:
            listas_set = set(listas_vendedor)
            p.listas_precio = [lp for lp in (p.listas_precio or []) if lp.lista in listas_set]
        return p

    def obtener_por_codigo_lista(self, codigo: str, lista: str) -> Producto:
        p = self.repo.get_by_codigo_lista_with_listas(codigo, lista)
        if not p:
            raise NotFoundError("Producto no encontrado")
        return p

    def crear(self, data: ProductoCreate) -> Producto:
        dump = data.model_dump()
        listas_precio = dump.pop("listas_precio", [])
        for lp in listas_precio:
            if self.repo.exists_codigo_en_lista(lp["codigo"], lp["lista"]):
                raise ValidationError(
                    f"Ya existe un producto con código '{lp['codigo']}' en la lista {lp['lista']}"
                )
        producto = Producto(referencia=dump["referencia"], material=dump["material"])
        self.db.add(producto)
        self.db.flush()
        for lp in listas_precio:
            self.db.add(
                ProductoListaPrecio(
                    producto_id=producto.id,
                    lista=lp["lista"],
                    codigo=lp["codigo"],
                    precio=lp["precio"],
                )
            )
        inv = Inventario(producto_id=producto.id, stock_actual=0, stock_minimo=0)
        self.db.add(inv)
        self.db.commit()
        return self.repo.get_with_listas(producto.id)

    def actualizar(self, id: int, data: ProductoUpdate) -> Producto:
        producto = self.obtener(id)
        attrs = data.model_dump(exclude_unset=True)
        if "referencia" in attrs:
            producto.referencia = attrs["referencia"]
        if "material" in attrs:
            producto.material = attrs["material"]
        if "listas_precio" in attrs:
            for lp in attrs["listas_precio"]:
                if self.repo.exists_codigo_en_lista(
                    lp["codigo"], lp["lista"], exclude_producto_id=id
                ):
                    raise ValidationError(
                        f"Ya existe un producto con código '{lp['codigo']}' en la lista {lp['lista']}"
                    )
            for plp in list(producto.listas_precio):
                self.db.delete(plp)
            self.db.flush()
            for lp in attrs["listas_precio"]:
                self.db.add(
                    ProductoListaPrecio(
                        producto_id=id,
                        lista=lp["lista"],
                        codigo=lp["codigo"],
                        precio=lp["precio"],
                    )
                )
        self.db.commit()
        return self.repo.get_with_listas(id)

    def eliminar(self, id: int) -> None:
        producto = self.obtener(id)
        self.db.delete(producto)
        self.db.commit()
