"""Pruebas de regresión de reportes/ventas-vendedores y reportes/top-clientes-productos:
- Junio (y cualquier mes de 30 días) daba 500 por un día 31 fijo en la fecha fin.
- La cantidad de unidades compradas no se incluía para los clientes.
- El acumulado de varios meses no traía promedio ni el stock actual del producto.
"""
from datetime import datetime, timezone

from app.models import Cliente, DetallePedido, Inventario, Pedido, Producto, Usuario


def _crear_pedido_enviado(db_session, fecha_envio, cantidad=5, cliente=None, producto=None, numero_pedido=None):
    if cliente is None:
        cliente = Cliente(
            razon_social="Cliente Test",
            tipo_documento="CC",
            numero_identificacion="1",
            estado_cliente="enviar",
        )
        db_session.add(cliente)
    usuario = Usuario(auth_user_id=f"auth-vendedor-{fecha_envio.isoformat()}", email=f"v{fecha_envio.month}@test.com", nombre="Vendedor", activo=True)
    if producto is None:
        producto = Producto(referencia="REF-1", material="Acero")
        db_session.add(producto)
    db_session.add(usuario)
    db_session.flush()

    pedido = Pedido(
        numero_pedido=numero_pedido or f"PED-TEST-{fecha_envio.isoformat()}",
        cliente_id=cliente.id,
        usuario_id=usuario.id,
        estado="enviado",
        fecha_envio=fecha_envio,
        subtotal=1000,
        total=1000,
    )
    db_session.add(pedido)
    db_session.flush()

    db_session.add(
        DetallePedido(
            pedido_id=pedido.id,
            producto_id=producto.id,
            cantidad=cantidad,
            precio_unitario=200,
            subtotal=200 * cantidad,
        )
    )
    db_session.commit()
    return cliente, producto


def test_ventas_vendedores_incluye_cantidad_por_cliente(client, admin_user, autenticar, db_session):
    autenticar(admin_user)
    fecha = datetime(2026, 3, 15, 12, 0, 0, tzinfo=timezone.utc)
    cliente, _producto = _crear_pedido_enviado(db_session, fecha, cantidad=7)

    resp = client.get("/api/v1/reportes/ventas-vendedores", params={"year": 2026, "month": 3})
    assert resp.status_code == 200
    top_clientes = resp.json()["top_clientes"]
    assert len(top_clientes) == 1
    assert top_clientes[0]["cliente_id"] == cliente.id
    assert top_clientes[0]["cantidad"] == 7


def test_top_clientes_productos_junio_no_da_500(client, admin_user, autenticar, db_session):
    """Junio tiene 30 días -- antes del fix, `datetime(year, 6, 31, ...)` lanzaba
    ValueError y el endpoint respondía 500."""
    autenticar(admin_user)
    fecha = datetime(2026, 6, 10, 12, 0, 0, tzinfo=timezone.utc)
    cliente, _producto = _crear_pedido_enviado(db_session, fecha, cantidad=3)

    resp = client.get(
        "/api/v1/reportes/top-clientes-productos",
        params={"year": 2026, "months": "6"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["top_clientes"]) == 1
    assert data["top_clientes"][0]["cliente_id"] == cliente.id
    assert data["top_clientes"][0]["cantidad"] == 3
    assert data["top_clientes"][0]["total"] == 1000.0


def test_top_clientes_productos_varios_meses_incluye_promedio_y_stock(client, admin_user, autenticar, db_session):
    autenticar(admin_user)
    cliente, producto = _crear_pedido_enviado(
        db_session, datetime(2026, 1, 10, 12, 0, 0, tzinfo=timezone.utc), cantidad=4, numero_pedido="PED-ENE"
    )
    _crear_pedido_enviado(
        db_session,
        datetime(2026, 2, 10, 12, 0, 0, tzinfo=timezone.utc),
        cantidad=6,
        cliente=cliente,
        producto=producto,
        numero_pedido="PED-FEB",
    )
    db_session.add(Inventario(producto_id=producto.id, stock_actual=42, stock_minimo=0))

    # Pedido pendiente (no enviado) del mismo producto -- resta del "Disponible".
    usuario_pendiente = Usuario(auth_user_id="auth-pendiente", email="pendiente@test.com", nombre="V", activo=True)
    db_session.add(usuario_pendiente)
    db_session.flush()
    pedido_pendiente = Pedido(
        numero_pedido="PED-PENDIENTE",
        cliente_id=cliente.id,
        usuario_id=usuario_pendiente.id,
        estado="en_espera",
        subtotal=0,
        total=0,
    )
    db_session.add(pedido_pendiente)
    db_session.flush()
    db_session.add(
        DetallePedido(
            pedido_id=pedido_pendiente.id,
            producto_id=producto.id,
            cantidad=10,
            precio_unitario=200,
            subtotal=2000,
        )
    )
    db_session.commit()

    resp = client.get(
        "/api/v1/reportes/top-clientes-productos",
        params={"year": 2026, "months": "1,2"},
    )
    assert resp.status_code == 200
    data = resp.json()

    cliente_data = data["top_clientes"][0]
    assert cliente_data["total"] == 2000.0  # 1000 + 1000
    assert cliente_data["promedio"] == 1000.0  # 2000 / 2 meses

    producto_data = data["top_productos"][0]
    assert producto_data["cantidad"] == 10  # 4 + 6
    assert producto_data["promedio"] == 5.0  # 10 / 2 meses
    assert producto_data["stock_actual"] == 42
    assert producto_data["disponible"] == 32  # 42 stock - 10 requerido (pendiente)
    assert producto_data["produccion"] == 27.0  # 32 disponible - 5.0 promedio
