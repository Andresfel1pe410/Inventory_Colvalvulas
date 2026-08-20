"""Pruebas de reportes/movimientos/reporte: filtro por referencia (producto_id)
y columna 'Modificado por' (usuario que hizo el movimiento)."""
from datetime import date

from app.models import MovimientoInventario, Producto, Usuario
from app.repositories.movimiento_inventario_repository import MovimientoInventarioRepository


def _crear_movimiento(db_session, producto, usuario, tipo="entrada", cantidad=5):
    mov = MovimientoInventario(
        producto_id=producto.id,
        tipo=tipo,
        cantidad=cantidad,
        stock_anterior=0,
        stock_nuevo=cantidad,
        motivo="Ajuste manual",
        usuario_id=usuario.id if usuario else None,
    )
    db_session.add(mov)
    db_session.commit()
    return mov


def test_reporte_movimientos_incluye_usuario_que_lo_hizo(db_session):
    producto = Producto(referencia="REF-A", material="Acero")
    usuario = Usuario(auth_user_id="auth-1", email="ana@test.com", nombre="Ana", apellido="Gomez", activo=True)
    db_session.add_all([producto, usuario])
    db_session.flush()
    _crear_movimiento(db_session, producto, usuario)

    hoy = date.today()
    resultado = MovimientoInventarioRepository(db_session).get_reporte_movimientos(hoy, hoy)

    assert len(resultado) == 1
    assert resultado[0]["usuario_nombre"] == "Ana Gomez"


def test_reporte_movimientos_filtra_por_producto_id(db_session):
    producto_a = Producto(referencia="REF-A", material="Acero")
    producto_b = Producto(referencia="REF-B", material="Bronce")
    db_session.add_all([producto_a, producto_b])
    db_session.flush()
    _crear_movimiento(db_session, producto_a, None)
    _crear_movimiento(db_session, producto_b, None)

    hoy = date.today()
    repo = MovimientoInventarioRepository(db_session)

    todos = repo.get_reporte_movimientos(hoy, hoy)
    assert len(todos) == 2

    solo_a = repo.get_reporte_movimientos(hoy, hoy, producto_id=producto_a.id)
    assert len(solo_a) == 1
    assert solo_a[0]["producto_id"] == producto_a.id
    assert solo_a[0]["producto_referencia"] == "REF-A"
