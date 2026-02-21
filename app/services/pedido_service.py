"""Servicio de pedidos."""
from datetime import datetime
from decimal import Decimal
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.models import Pedido, DetallePedido, Producto
from app.repositories.pedido_repository import PedidoRepository
from app.repositories.producto_repository import ProductoRepository
from app.schemas import PedidoCreate, PedidoUpdateFull, DetallePedidoCreate


ESTADOS_VALIDOS = ("en_espera", "en_proceso", "enviado", "cancelado")
TRANSPORTADORAS = ("YP", "A.N.", "E.Express", "Interrapidisimo")
LISTAS_PRECIOS = ("lista_1", "lista_2", "lista_3", "lista_plus")


def _precio_desde_lista(prod: Producto, lista: str) -> Decimal:
    """Obtiene el precio del producto si pertenece a la lista seleccionada."""
    if prod.lista == lista:
        return Decimal(str(prod.precio))
    return Decimal("0")


class PedidoService:
    def __init__(self, db):
        self.db = db
        self.repo = PedidoRepository(db)
        self.producto_repo = ProductoRepository(db)

    def listar(
        self, skip: int = 0, limit: int = 100, estados: list[str] | None = None
    ) -> list[Pedido]:
        if estados:
            return self.repo.get_by_estados(estados, skip, limit)
        return self.repo.get_all(skip, limit)

    def obtener(self, id: int) -> Pedido:
        p = self.repo.get_with_detalles(id)
        if not p:
            raise NotFoundError("Pedido no encontrado")
        return p

    def crear(self, data: PedidoCreate, usuario_id: int) -> Pedido:
        lista = data.lista_precios or "lista_1"
        if lista not in LISTAS_PRECIOS:
            raise ValidationError(f"Lista inválida. Válidas: {LISTAS_PRECIOS}")
        numero = self.repo.generar_numero()
        pedido = Pedido(
            numero_pedido=numero,
            cliente_id=data.cliente_id,
            usuario_id=usuario_id,
            estado="en_espera",
            observaciones=data.observaciones,
            lista_precios=lista,
            descuento=data.descuento or 0,
            subtotal=0,
            total=0,
        )
        self.db.add(pedido)
        self.db.flush()

        for det in data.detalles:
            prod = self.producto_repo.get(det.producto_id)
            if not prod:
                raise NotFoundError(f"Producto {det.producto_id} no encontrado")
            precio = det.precio_unitario if det.precio_unitario else _precio_desde_lista(prod, lista)
            subtotal = Decimal(str(precio)) * det.cantidad
            self.db.add(
                DetallePedido(
                    pedido_id=pedido.id,
                    producto_id=det.producto_id,
                    cantidad=det.cantidad,
                    precio_unitario=precio,
                    subtotal=subtotal,
                )
            )

        self._recalcular_totales(pedido.id)
        self.db.commit()
        self.db.refresh(pedido)
        return pedido

    def actualizar(self, pedido_id: int, data: PedidoUpdateFull, usuario_id: int) -> Pedido:
        """Actualiza pedido completo. Solo en_espera o en_proceso."""
        pedido = self.obtener(pedido_id)
        if pedido.estado == "enviado":
            raise ValidationError("No se puede modificar un pedido ya enviado")
        if pedido.estado == "cancelado":
            raise ValidationError("No se puede modificar un pedido cancelado")

        lista = data.lista_precios or "lista_1"
        if lista not in LISTAS_PRECIOS:
            raise ValidationError(f"Lista inválida. Válidas: {LISTAS_PRECIOS}")

        pedido.cliente_id = data.cliente_id
        pedido.observaciones = data.observaciones
        pedido.lista_precios = lista
        pedido.descuento = data.descuento or 0

        # Eliminar detalles existentes
        for det in list(pedido.detalles):
            self.db.delete(det)
        self.db.flush()

        # Agregar nuevos detalles
        for det in data.detalles:
            prod = self.producto_repo.get(det.producto_id)
            if not prod:
                raise NotFoundError(f"Producto {det.producto_id} no encontrado")
            precio = det.precio_unitario if det.precio_unitario else _precio_desde_lista(prod, lista)
            subtotal = Decimal(str(precio)) * det.cantidad
            self.db.add(
                DetallePedido(
                    pedido_id=pedido_id,
                    producto_id=det.producto_id,
                    cantidad=det.cantidad,
                    precio_unitario=precio,
                    subtotal=subtotal,
                )
            )

        self._recalcular_totales(pedido_id)
        self.db.commit()
        self.db.refresh(pedido)
        return pedido

    def agregar_detalle(self, pedido_id: int, data: DetallePedidoCreate, usuario_id: int) -> DetallePedido:
        pedido = self.obtener(pedido_id)
        if pedido.usuario_id != usuario_id:
            raise ForbiddenError("No puede modificar este pedido")
        if pedido.estado != "en_espera":
            raise ValidationError("Solo se pueden modificar pedidos en espera")

        prod = self.producto_repo.get(data.producto_id)
        if not prod:
            raise NotFoundError("Producto no encontrado")
        lista = pedido.lista_precios or "lista_1"
        precio = data.precio_unitario if data.precio_unitario else _precio_desde_lista(prod, lista)
        subtotal = Decimal(str(precio)) * data.cantidad

        det = DetallePedido(
            pedido_id=pedido_id,
            producto_id=data.producto_id,
            cantidad=data.cantidad,
            precio_unitario=precio,
            subtotal=subtotal,
        )
        self.db.add(det)
        self.db.flush()
        self._recalcular_totales(pedido_id)
        self.db.commit()
        self.db.refresh(det)
        return det

    def cambiar_estado(self, pedido_id: int, nuevo_estado: str) -> Pedido:
        pedido = self.obtener(pedido_id)
        if nuevo_estado not in ESTADOS_VALIDOS:
            raise ValidationError(f"Estado inválido. Válidos: {ESTADOS_VALIDOS}")
        if pedido.estado == "enviado":
            raise ValidationError("No se puede cambiar el estado de un pedido enviado")
        if pedido.estado == "cancelado":
            raise ValidationError("No se puede cambiar el estado de un pedido cancelado")
        pedido.estado = nuevo_estado
        self.db.commit()
        self.db.refresh(pedido)
        return pedido

    def marcar_enviado(
        self,
        pedido_id: int,
        usuario_id: int,
        transportadora: str,
        numero_factura: str | None = None,
        numero_guia: str | None = None,
        detalles_envio: list | None = None,
        resumen_envio: str | None = None,
    ) -> Pedido:
        pedido = self.obtener(pedido_id)
        if pedido.estado == "enviado":
            raise ValidationError("El pedido ya está enviado")
        if pedido.estado == "cancelado":
            raise ValidationError("No se puede enviar un pedido cancelado")
        if transportadora not in TRANSPORTADORAS:
            raise ValidationError(f"Transportadora inválida. Válidas: {TRANSPORTADORAS}")

        pedido.estado = "enviado"
        pedido.fecha_envio = datetime.utcnow()
        pedido.usuario_envio_id = usuario_id
        pedido.transportadora = transportadora
        pedido.numero_factura = numero_factura or None
        pedido.numero_guia = numero_guia or None
        pedido.resumen_envio = resumen_envio or None
        self.db.commit()
        self.db.refresh(pedido)

        # Generar remisión y movimientos de inventario (con cantidades del checklist)
        from app.services.remision_service import RemisionService
        RemisionService(self.db).generar_desde_pedido(
            pedido_id, usuario_id, detalles_envio=detalles_envio
        )

        return pedido

    def _recalcular_totales(self, pedido_id: int) -> None:
        pedido = self.repo.get(pedido_id)
        if not pedido:
            return
        detalles = [d for d in pedido.detalles]
        subtotal = sum(d.subtotal for d in detalles)
        descuento = pedido.descuento or 0
        pedido.subtotal = subtotal
        pedido.total = subtotal * (1 - Decimal(str(descuento)) / 100)
