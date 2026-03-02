"""
Servicio de inventario - movimientos y actualización de stock.
"""
from app.core.exceptions import NotFoundError, ValidationError
from app.models import Inventario, MovimientoInventario
from app.repositories.inventario_repository import InventarioRepository
from app.repositories.movimiento_inventario_repository import MovimientoInventarioRepository


class InventarioService:
    def __init__(self, db):
        self.db = db
        self.repo = InventarioRepository(db)
        self.mov_repo = MovimientoInventarioRepository(db)

    def registrar_movimiento(
        self,
        producto_id: int,
        tipo: str,
        cantidad: int,
        motivo: str | None = None,
        referencia_tipo: str | None = None,
        referencia_id: int | None = None,
        usuario_id: int | None = None,
        commit: bool = True,
    ) -> MovimientoInventario:
        if tipo not in ("entrada", "salida", "ajuste"):
            raise ValidationError("Tipo de movimiento inválido")
        if cantidad == 0:
            raise ValidationError("La cantidad no puede ser cero")

        inv = self.repo.get_by_producto(producto_id)
        if not inv:
            inv = Inventario(producto_id=producto_id, stock_actual=0, stock_minimo=0)
            self.db.add(inv)
            self.db.flush()

        stock_anterior = inv.stock_actual
        if tipo in ("entrada", "ajuste"):
            stock_nuevo = stock_anterior + cantidad  # cantidad puede ser negativa
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
        if commit:
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

    def corregir_movimiento(
        self,
        movimiento_id: int,
        nuevo_producto_id: int,
        nueva_cantidad: int,
        usuario_id: int | None = None,
    ) -> tuple[MovimientoInventario, MovimientoInventario]:
        """
        Corrige un movimiento de entrada: crea salida para revertir el original
        y entrada para el producto/cantidad corregido.
        """
        mov = self.mov_repo.get_by_id(movimiento_id)
        if not mov:
            raise NotFoundError("Movimiento no encontrado")
        if mov.tipo != "entrada":
            raise ValidationError("Solo se pueden corregir movimientos de entrada")

        # Revertir salida del producto original
        self.registrar_movimiento(
            producto_id=mov.producto_id,
            tipo="salida",
            cantidad=mov.cantidad,
            motivo="Corrección de entrada",
            usuario_id=usuario_id,
            commit=False,
        )

        # Nueva entrada con producto/cantidad corregido
        self.db.flush()
        nuevo_mov = self.registrar_movimiento(
            producto_id=nuevo_producto_id,
            tipo="entrada",
            cantidad=nueva_cantidad,
            motivo="Corrección de entrada",
            usuario_id=usuario_id,
            commit=True,
        )

        # Obtener el movimiento de salida creado
        salida = (
            self.db.query(MovimientoInventario)
            .filter(
                MovimientoInventario.producto_id == mov.producto_id,
                MovimientoInventario.tipo == "salida",
            )
            .order_by(MovimientoInventario.id.desc())
            .first()
        )
        return (salida, nuevo_mov)
