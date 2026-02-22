"""
Servicio de inventario - movimientos y actualización de stock.
"""
from app.core.exceptions import NotFoundError, ValidationError
from app.models import Inventario, MovimientoInventario
from app.repositories.inventario_repository import InventarioRepository


class InventarioService:
    def __init__(self, db):
        self.db = db
        self.repo = InventarioRepository(db)

    def registrar_movimiento(
        self,
        producto_id: int,
        tipo: str,
        cantidad: int,
        motivo: str | None = None,
        referencia_tipo: str | None = None,
        referencia_id: int | None = None,
        usuario_id: int | None = None,
    ) -> MovimientoInventario:
        if tipo not in ("entrada", "salida", "ajuste"):
            raise ValidationError("Tipo de movimiento inválido")
        if cantidad <= 0:
            raise ValidationError("La cantidad debe ser mayor a cero")

        inv = self.repo.get_by_producto(producto_id)
        if not inv:
            inv = Inventario(producto_id=producto_id, stock_actual=0, stock_minimo=0)
            self.db.add(inv)
            self.db.flush()

        stock_anterior = inv.stock_actual
        if tipo in ("entrada", "ajuste"):
            stock_nuevo = stock_anterior + cantidad
        else:
            stock_nuevo = stock_anterior - cantidad

        mov = MovimientoInventario(
            producto_id=producto_id,
            tipo=tipo,
            cantidad=cantidad,
            stock_anterior=stock_anterior,
            stock_nuevo=stock_nuevo,
            motivo=motivo,
            referencia_tipo=referencia_tipo,
            referencia_id=referencia_id,
            usuario_id=usuario_id,
        )
        self.db.add(mov)
        inv.stock_actual = stock_nuevo
        self.db.commit()
        self.db.refresh(mov)
        return mov

    def actualizar_stock(self, producto_id: int, nuevo_stock: int) -> Inventario:
        inv = self.repo.get_by_producto(producto_id)
        if not inv:
            raise NotFoundError("Inventario del producto no encontrado")
        inv.stock_actual = nuevo_stock
        self.db.commit()
        self.db.refresh(inv)
        return inv
