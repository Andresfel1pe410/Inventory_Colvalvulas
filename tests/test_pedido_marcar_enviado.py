"""
Prueba de regresión: antes de este fix, `marcar_enviado` confirmaba el cambio
de estado del pedido a "enviado" ANTES de generar la remisión. Si la remisión
fallaba (ej. stock insuficiente), el pedido quedaba marcado "enviado" sin
remisión, y `desmarcar_enviado` no podía revertirlo porque no la encontraba.
"""
import pytest

from app.core.exceptions import ValidationError
from app.models import Cliente, DetallePedido, Empleado as _Empleado  # noqa: F401 (asegura import de modelos)
from app.models import Inventario, Pedido, Producto, Usuario
from app.repositories.remision_repository import RemisionRepository
from app.services.pedido_service import PedidoService


def _crear_pedido_con_producto(db_session, stock_disponible: int, cantidad_pedida: int):
    cliente = Cliente(
        razon_social="Cliente Test",
        tipo_documento="CC",
        numero_identificacion="1",
        estado_cliente="enviar",
    )
    usuario = Usuario(auth_user_id="auth-vendedor", email="vendedor@test.com", nombre="Vendedor", activo=True)
    producto = Producto(referencia="REF-1", material="Acero")
    db_session.add_all([cliente, usuario, producto])
    db_session.flush()

    db_session.add(Inventario(producto_id=producto.id, stock_actual=stock_disponible, stock_minimo=0))

    pedido = Pedido(
        numero_pedido="PED-TEST-001",
        cliente_id=cliente.id,
        usuario_id=usuario.id,
        estado="en_proceso",
        subtotal=0,
        total=0,
    )
    db_session.add(pedido)
    db_session.flush()

    db_session.add(
        DetallePedido(
            pedido_id=pedido.id,
            producto_id=producto.id,
            cantidad=cantidad_pedida,
            precio_unitario=100,
            subtotal=100 * cantidad_pedida,
        )
    )
    db_session.commit()
    return pedido, usuario


def test_stock_insuficiente_no_deja_pedido_marcado_enviado(db_session):
    pedido, usuario = _crear_pedido_con_producto(db_session, stock_disponible=2, cantidad_pedida=10)

    service = PedidoService(db_session)
    with pytest.raises(ValidationError):
        service.marcar_enviado(pedido.id, usuario.id, transportadora="YP")

    db_session.rollback()

    pedido_refrescado = db_session.query(Pedido).filter_by(id=pedido.id).first()
    assert pedido_refrescado.estado == "en_proceso"  # NO "enviado"

    remision = RemisionRepository(db_session).get_by_pedido_id(pedido.id)
    assert remision is None


def test_stock_suficiente_marca_enviado_y_crea_remision(db_session):
    pedido, usuario = _crear_pedido_con_producto(db_session, stock_disponible=50, cantidad_pedida=10)

    service = PedidoService(db_session)
    resultado = service.marcar_enviado(pedido.id, usuario.id, transportadora="YP")

    assert resultado.estado == "enviado"
    remision = RemisionRepository(db_session).get_by_pedido_id(pedido.id)
    assert remision is not None
    assert remision.estado == "emitida"

    inventario = db_session.query(Inventario).filter_by(producto_id=pedido.detalles[0].producto_id).first()
    assert inventario.stock_actual == 40
