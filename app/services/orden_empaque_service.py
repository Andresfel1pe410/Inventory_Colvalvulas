"""Servicio de órdenes de empaque."""
from app.core.exceptions import NotFoundError, ValidationError
from app.models import OrdenEmpaque, DetalleEmpaque
from app.repositories.orden_empaque_repository import OrdenEmpaqueRepository
from app.repositories.pedido_repository import PedidoRepository
from app.repositories.inventario_repository import InventarioRepository
from app.schemas import OrdenEmpaqueCreate


class OrdenEmpaqueService:
    def __init__(self, db):
        self.db = db
        self.repo = OrdenEmpaqueRepository(db)
        self.pedido_repo = PedidoRepository(db)
        self.inv_repo = InventarioRepository(db)

    def listar(self, skip: int = 0, limit: int = 100) -> list[OrdenEmpaque]:
        return self.repo.get_all(skip, limit)

    def obtener(self, id: int) -> OrdenEmpaque:
        o = self.repo.get_with_detalles(id)
        if not o:
            raise NotFoundError("Orden de empaque no encontrada")
        return o

    def crear(self, data: OrdenEmpaqueCreate, usuario_id: int) -> OrdenEmpaque:
        pedido = self.pedido_repo.get(data.pedido_id)
        if not pedido:
            raise NotFoundError("Pedido no encontrado")

        numero = self.repo.generar_numero()
        orden = OrdenEmpaque(
            pedido_id=data.pedido_id,
            numero_orden=numero,
            estado="pendiente",
            usuario_id=usuario_id,
        )
        self.db.add(orden)
        self.db.flush()

        for det in data.detalles:
            inv = self.inv_repo.get_by_producto(det.producto_id)
            if not inv:
                raise NotFoundError(f"Inventario del producto {det.producto_id} no encontrado")
            self.db.add(
                DetalleEmpaque(
                    orden_empaque_id=orden.id,
                    producto_id=det.producto_id,
                    cantidad=det.cantidad,
                    cantidad_empacada=0,
                )
            )

        self.db.commit()
        self.db.refresh(orden)
        return orden

    def cerrar(self, orden_id: int, usuario_id: int) -> OrdenEmpaque:
        orden = self.obtener(orden_id)
        if orden.estado == "cerrada":
            raise ValidationError("La orden ya está cerrada")
        orden.estado = "cerrada"
        orden.usuario_id = usuario_id
        self.db.commit()
        self.db.refresh(orden)
        return orden
