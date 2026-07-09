"""Servicio de pedidos."""
from datetime import datetime
from decimal import Decimal
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError
from app.models import Pedido, DetallePedido, Producto
from app.repositories.cliente_repository import ClienteRepository
from app.repositories.pedido_repository import PedidoRepository
from app.repositories.producto_repository import ProductoRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas import PedidoCreate, PedidoUpdateFull, DetallePedidoCreate


ESTADOS_VALIDOS = ("en_espera", "en_proceso", "enviado", "cancelado")
TRANSPORTADORAS = ("YP", "A.N.", "E.Express", "Interrapidisimo")
LISTAS_PRECIOS = ("lista_1", "lista_2", "lista_3", "lista_plus", "lista_plus_costa")
ESTADOS_CLIENTE = ("enviar", "enviar_parcial", "no_enviar", "solo_contado")


def _precio_desde_lista(producto_repo, producto_id: int, lista: str) -> Decimal:
    """Obtiene el precio del producto desde producto_lista_precio para la lista indicada."""
    precio = producto_repo.get_precio_lista(producto_id, lista)
    return Decimal(str(precio)) if precio is not None else Decimal("0")


def _precios_desde_lista_batch(producto_repo, producto_ids: list[int], lista: str) -> dict[int, Decimal]:
    """Precios de varios productos en una consulta. {producto_id: precio}."""
    precios = producto_repo.get_precios_por_lista(producto_ids, lista)
    return {pid: Decimal(str(p)) for pid, p in precios.items()}


class PedidoService:
    def __init__(self, db):
        self.db = db
        self.repo = PedidoRepository(db)
        self.producto_repo = ProductoRepository(db)
        self.cliente_repo = ClienteRepository(db)

    def _estado_cliente(self, cliente_id: int) -> str:
        cliente = self.cliente_repo.get(cliente_id)
        if not cliente:
            raise NotFoundError("Cliente no encontrado")
        estado = getattr(cliente, "estado_cliente", None) or "enviar"
        return estado if estado in ESTADOS_CLIENTE else "enviar"

    def _aplicar_estado_cliente(self, pedido: Pedido | None) -> Pedido | None:
        if pedido and getattr(pedido, "cliente", None) is not None:
            estado = getattr(pedido.cliente, "estado_cliente", None) or "enviar"
            pedido.intencion_envio = estado if estado in ESTADOS_CLIENTE else "enviar"
        return pedido

    def listar(
        self,
        skip: int = 0,
        limit: int = 100,
        estados: list[str] | None = None,
        usuario_id: int | None = None,
        es_vendedor: bool = False,
    ) -> list[Pedido]:
        pedidos: list[Pedido]
        if es_vendedor and usuario_id:
            if estados:
                pedidos = self.repo.get_by_estados_for_usuario(usuario_id, estados, skip, limit)
            else:
                pedidos = self.repo.get_all_for_usuario(usuario_id, skip, limit)
        elif estados:
            pedidos = self.repo.get_by_estados(estados, skip, limit)
        else:
            pedidos = self.repo.get_all(skip, limit)
        return [p for p in (self._aplicar_estado_cliente(p) for p in pedidos) if p is not None]

    def obtener(self, id: int, usuario_id: int | None = None, es_vendedor: bool = False) -> Pedido:
        p = self.repo.get_with_detalles(id)
        if not p:
            raise NotFoundError("Pedido no encontrado")
        if es_vendedor and usuario_id and p.usuario_id != usuario_id:
            raise ForbiddenError("No tiene acceso a este pedido")
        return self._aplicar_estado_cliente(p) or p

    def obtener_bulk(
        self, ids: list[int], usuario_id: int | None = None, es_vendedor: bool = False
    ) -> list[Pedido]:
        """Trae varios pedidos con detalles en una sola consulta (evita N+1)."""
        if not ids:
            return []
        pedidos = self.repo.get_with_detalles_bulk(ids)
        if es_vendedor and usuario_id:
            pedidos = [p for p in pedidos if p.usuario_id == usuario_id]
        return [p for p in (self._aplicar_estado_cliente(p) for p in pedidos) if p is not None]

    def crear(self, data: PedidoCreate, usuario_id: int) -> Pedido:
        lista = data.lista_precios or "lista_1"
        if lista not in LISTAS_PRECIOS:
            raise ValidationError(f"Lista inválida. Válidas: {LISTAS_PRECIOS}")
        estado_cliente = self._estado_cliente(data.cliente_id)
        numero = self.repo.generar_numero()
        vendedor_id = data.vendedor_id or usuario_id
        pedido = Pedido(
            numero_pedido=numero,
            cliente_id=data.cliente_id,
            usuario_id=vendedor_id,
            estado="en_espera",
            observaciones=data.observaciones,
            lista_precios=lista,
            descuento=data.descuento or 0,
            intencion_envio=estado_cliente,
            subtotal=0,
            total=0,
        )
        self.db.add(pedido)
        self.db.flush()

        producto_ids = list({d.producto_id for d in data.detalles})
        productos_map = {p.id: p for p in self.producto_repo.get_by_ids(producto_ids)}
        precios_map = _precios_desde_lista_batch(self.producto_repo, producto_ids, lista)
        detalles_objs = []
        for det in data.detalles:
            prod = productos_map.get(det.producto_id)
            if not prod:
                raise NotFoundError(f"Producto {det.producto_id} no encontrado")
            precio = det.precio_unitario if det.precio_unitario else precios_map.get(det.producto_id, Decimal("0"))
            subtotal = Decimal(str(precio)) * det.cantidad
            d = DetallePedido(
                pedido_id=pedido.id,
                producto_id=det.producto_id,
                cantidad=det.cantidad,
                precio_unitario=precio,
                subtotal=subtotal,
            )
            self.db.add(d)
            detalles_objs.append(d)

        self.db.flush()
        pedido.detalles = detalles_objs
        self._recalcular_totales(pedido)
        self.db.commit()
        self.db.refresh(pedido)
        return pedido

    def actualizar(
        self,
        pedido_id: int,
        data: PedidoUpdateFull,
        usuario_id: int,
        usuario_id_check: int | None = None,
        es_vendedor: bool = False,
    ) -> Pedido:
        """Actualiza pedido completo. Solo en_espera o en_proceso."""
        pedido = self.obtener(pedido_id, usuario_id=usuario_id_check, es_vendedor=es_vendedor)
        if pedido.estado == "enviado":
            raise ValidationError("No se puede modificar un pedido ya enviado")
        if pedido.estado == "cancelado":
            raise ValidationError("No se puede modificar un pedido cancelado")

        lista = data.lista_precios or "lista_1"
        if lista not in LISTAS_PRECIOS:
            raise ValidationError(f"Lista inválida. Válidas: {LISTAS_PRECIOS}")

        estado_cliente = self._estado_cliente(data.cliente_id)
        pedido.cliente_id = data.cliente_id
        pedido.observaciones = data.observaciones
        pedido.lista_precios = lista
        pedido.descuento = data.descuento or 0
        if data.vendedor_id is not None:
            pedido.usuario_id = data.vendedor_id
        pedido.intencion_envio = estado_cliente

        # Eliminar detalles existentes
        for det in list(pedido.detalles):
            self.db.delete(det)
        self.db.flush()

        # Agregar nuevos detalles (batch fetch productos y precios para evitar N+1)
        producto_ids = list({d.producto_id for d in data.detalles})
        productos_map = {p.id: p for p in self.producto_repo.get_by_ids(producto_ids)}
        precios_map = _precios_desde_lista_batch(self.producto_repo, producto_ids, lista)
        detalles_objs = []
        for det in data.detalles:
            prod = productos_map.get(det.producto_id)
            if not prod:
                raise NotFoundError(f"Producto {det.producto_id} no encontrado")
            precio = det.precio_unitario if det.precio_unitario else precios_map.get(det.producto_id, Decimal("0"))
            subtotal = Decimal(str(precio)) * det.cantidad
            d = DetallePedido(
                pedido_id=pedido_id,
                producto_id=det.producto_id,
                cantidad=det.cantidad,
                precio_unitario=precio,
                subtotal=subtotal,
            )
            self.db.add(d)
            detalles_objs.append(d)

        self.db.flush()
        pedido.detalles = detalles_objs
        self._recalcular_totales(pedido)
        self.db.commit()
        return self.repo.get_with_detalles(pedido_id)

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
        precio = data.precio_unitario if data.precio_unitario else _precio_desde_lista(self.producto_repo, data.producto_id, lista)
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
        pedido.detalles.append(det)  # incluir en colección para _recalcular_totales
        self._recalcular_totales(pedido)
        self.db.commit()
        self.db.refresh(det)
        return det

    def actualizar_intencion_envio(
        self,
        pedido_id: int,
        intencion_envio: str | None,
        usuario_id: int | None = None,
        es_vendedor: bool = False,
    ) -> Pedido:
        """Actualiza el estado del cliente asociado al pedido."""
        pedido = self.obtener(pedido_id, usuario_id=usuario_id, es_vendedor=es_vendedor)
        if intencion_envio and intencion_envio not in ESTADOS_CLIENTE:
            raise ValidationError(
                "Estado inválido. Válidos: enviar, enviar_parcial, no_enviar, solo_contado"
            )
        estado = intencion_envio or "enviar"
        cliente = self.cliente_repo.get(pedido.cliente_id)
        if not cliente:
            raise NotFoundError("Cliente no encontrado")
        cliente.estado_cliente = estado
        self.db.commit()
        return self.obtener(pedido_id, usuario_id=usuario_id, es_vendedor=es_vendedor)

    def cambiar_estado(
        self,
        pedido_id: int,
        nuevo_estado: str,
        usuario_id: int | None = None,
        es_vendedor: bool = False,
    ) -> Pedido:
        pedido = self.obtener(pedido_id, usuario_id=usuario_id, es_vendedor=es_vendedor)
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

    def marcar_impreso(
        self,
        pedido_id: int,
        impreso: bool,
        usuario_id: int | None = None,
        es_vendedor: bool = False,
    ) -> Pedido:
        """Actualiza el flag de impresión del pedido."""
        pedido = self.obtener(pedido_id, usuario_id=usuario_id, es_vendedor=es_vendedor)
        pedido.impreso = impreso
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
        usuario_id_check: int | None = None,
        es_vendedor: bool = False,
    ) -> Pedido:
        pedido = self.obtener(pedido_id, usuario_id=usuario_id_check, es_vendedor=es_vendedor)
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

        # Generar remisión y movimientos de inventario (con cantidades del checklist).
        # No se confirma el estado del pedido hasta que esto tenga éxito: si falla
        # (p.ej. stock insuficiente), el pedido no debe quedar marcado como enviado
        # sin una remisión asociada.
        from app.services.remision_service import RemisionService
        RemisionService(self.db).generar_desde_pedido(
            pedido_id, usuario_id, detalles_envio=detalles_envio
        )

        return self.repo.get_with_detalles(pedido_id)

    def desmarcar_enviado(
        self,
        pedido_id: int,
        usuario_id: int | None = None,
        es_vendedor: bool = False,
    ) -> Pedido:
        """Revierte pedido de enviado a en_proceso: suma entradas al inventario y anula la remisión."""
        pedido = self.obtener(pedido_id, usuario_id=usuario_id, es_vendedor=es_vendedor)
        if pedido.estado != "enviado":
            raise ValidationError("Solo se puede desmarcar un pedido en estado enviado")

        from app.repositories.remision_repository import RemisionRepository
        from app.services.inventario_service import InventarioService

        rem_repo = RemisionRepository(self.db)
        remision = rem_repo.get_by_pedido_id(pedido_id)
        if not remision:
            raise ValidationError("No se encontró remisión para este pedido")
        remision = rem_repo.get_with_detalles(remision.id)
        if not remision.detalles:
            raise ValidationError("La remisión no tiene detalles")

        inv_service = InventarioService(self.db)
        for det in remision.detalles:
            inv_service.registrar_movimiento(
                producto_id=det.producto_id,
                tipo="entrada",
                cantidad=det.cantidad,
                motivo=f"Reversión: desmarcar enviado - Pedido {pedido.numero_pedido}",
                referencia_tipo="remision",
                referencia_id=remision.id,
                usuario_id=None,
                commit=False,
            )

        remision.estado = "cancelada"
        pedido.estado = "en_proceso"
        pedido.fecha_envio = None
        pedido.usuario_envio_id = None
        pedido.transportadora = None
        pedido.numero_factura = None
        pedido.numero_guia = None
        pedido.resumen_envio = None

        self.db.commit()
        return self.repo.get_with_detalles(pedido_id)

    def _recalcular_totales(self, pedido: Pedido) -> None:
        detalles = [d for d in pedido.detalles]
        subtotal = sum(d.subtotal for d in detalles)
        descuento = pedido.descuento or 0
        pedido.subtotal = subtotal
        pedido.total = subtotal * (1 - Decimal(str(descuento)) / 100)
