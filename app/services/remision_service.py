"""
Servicio de remisiones.
Al generar remisión: crear movimiento_inventario tipo salida y actualizar inventario.
Genera desde pedido cuando se marca como enviado.
"""
from datetime import date
from app.core.exceptions import NotFoundError, ValidationError
from app.models import Remision, DetalleRemision
from app.repositories.remision_repository import RemisionRepository
from app.repositories.pedido_repository import PedidoRepository
from app.services.inventario_service import InventarioService
class RemisionService:
    def __init__(self, db):
        self.db = db
        self.repo = RemisionRepository(db)
        self.pedido_repo = PedidoRepository(db)
        self.inv_service = InventarioService(db)

    def listar(self, skip: int = 0, limit: int = 100) -> list:
        """Lista remisiones con datos del pedido asociado."""
        remisiones = self.repo.get_all_with_pedido(skip, limit)
        result = []
        for r in remisiones:
            item = {
                "id": r.id,
                "numero_remision": r.numero_remision,
                "pedido_id": r.pedido_id,
                "cliente_id": r.cliente_id,
                "estado": r.estado,
                "fecha_emision": r.fecha_emision,
                "fecha_entrega": r.fecha_entrega,
                "created_at": r.created_at,
                "updated_at": r.updated_at,
                "numero_pedido": None,
                "numero_factura": None,
                "numero_guia": None,
                "transportadora": None,
            }
            if r.pedido:
                item["numero_pedido"] = r.pedido.numero_pedido
                item["numero_factura"] = r.pedido.numero_factura
                item["numero_guia"] = r.pedido.numero_guia
                item["transportadora"] = r.pedido.transportadora
            result.append(item)
        return result

    def obtener(self, id: int) -> Remision:
        r = self.repo.get(id)
        if not r:
            raise NotFoundError("Remisión no encontrada")
        return r

    def generar_desde_pedido(
        self, pedido_id: int, usuario_id: int, detalles_envio: list | None = None
    ) -> Remision:
        """Genera remisión y movimientos de inventario desde un pedido enviado.
        Si detalles_envio está presente, usa cantidad_enviada por producto; sino usa cantidad del pedido.
        """
        pedido = self.pedido_repo.get_with_detalles(pedido_id)
        if not pedido:
            raise NotFoundError("Pedido no encontrado")
        if pedido.estado != "enviado":
            raise ValidationError("El pedido debe estar en estado enviado")

        # Mapa producto_id -> cantidad_enviada (0 = no enviado, se omite)
        cantidades = {}
        if detalles_envio:
            for d in detalles_envio:
                qty = d.cantidad_enviada if hasattr(d, "cantidad_enviada") else d.get("cantidad_enviada", 0)
                pid = d.producto_id if hasattr(d, "producto_id") else d.get("producto_id")
                if qty > 0 and pid is not None:
                    cantidades[pid] = qty

        numero = self.repo.generar_numero()
        remision = Remision(
            numero_remision=numero,
            pedido_id=pedido.id,
            cliente_id=pedido.cliente_id,
            estado="emitida",
            fecha_emision=date.today(),
        )
        self.db.add(remision)
        self.db.flush()

        for det in pedido.detalles:
            cantidad = cantidades.get(det.producto_id, det.cantidad) if cantidades else det.cantidad
            if cantidad <= 0:
                continue
            self.db.add(
                DetalleRemision(
                    remision_id=remision.id,
                    producto_id=det.producto_id,
                    cantidad=cantidad,
                )
            )
            self.inv_service.registrar_movimiento(
                producto_id=det.producto_id,
                tipo="salida",
                cantidad=cantidad,
                motivo=f"Remisión {numero} - Pedido {pedido.numero_pedido}",
                referencia_tipo="remision",
                referencia_id=remision.id,
                usuario_id=usuario_id,
                commit=False,
            )

        self.db.commit()
        self.db.refresh(remision)
        return remision
