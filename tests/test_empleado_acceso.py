"""Pruebas de acceso de login para empleados (EmpleadoAccesoService).

La llamada real a la Admin API de Supabase (`crear_usuario_auth`) no se
puede probar contra la base SQLite de las pruebas -- se mockea, y se simula
manualmente lo que haría el trigger `002_sync_usuario_on_signup.sql` en
producción (crear la fila `usuario` con rol 'vendedor' por defecto), para
validar que el servicio la corrija a rol 'empleado' + la vincule."""
from unittest.mock import patch

import pytest

from app.core.exceptions import AppException, NotFoundError, ValidationError
from app.models import Empleado, Rol, Usuario, UsuarioRol
from app.repositories.usuario_repository import UsuarioRepository
from app.services.empleado_acceso_service import EmpleadoAccesoService


def _crear_empleado(db_session, nombre="Juan Perez", documento="123456", activo=True) -> Empleado:
    empleado = Empleado(nombre=nombre, documento=documento, activo=activo)
    db_session.add(empleado)
    db_session.commit()
    db_session.refresh(empleado)
    return empleado


def _asegurar_rol_empleado(db_session) -> None:
    """Simula que la migración 031_usuario_empleado_acceso.sql ya corrió
    (crea el rol 'empleado' si no existe)."""
    if not db_session.query(Rol).filter_by(nombre="empleado").first():
        db_session.add(Rol(nombre="empleado", descripcion="empleado"))
        db_session.commit()


def _simular_trigger_signup(db_session, auth_user_id: str, email: str) -> Usuario:
    """Simula lo que 002_sync_usuario_on_signup.sql hace en Postgres: crea
    la fila `usuario` con rol 'vendedor' autoasignado."""
    rol_vendedor = db_session.query(Rol).filter_by(nombre="vendedor").first()
    if not rol_vendedor:
        rol_vendedor = Rol(nombre="vendedor", descripcion="vendedor")
        db_session.add(rol_vendedor)
        db_session.flush()
    usuario = Usuario(auth_user_id=auth_user_id, email=email, nombre=email.split("@")[0], activo=True)
    db_session.add(usuario)
    db_session.flush()
    db_session.add(UsuarioRol(usuario_id=usuario.id, rol_id=rol_vendedor.id))
    db_session.commit()
    db_session.refresh(usuario)
    return usuario


# ---------- Permisos del endpoint ----------


def test_acceso_rechaza_sin_autenticar(client, db_session):
    empleado = _crear_empleado(db_session)
    resp = client.get(f"/api/v1/rrhh/empleados/{empleado.id}/acceso")
    assert resp.status_code == 401


def test_acceso_rechaza_no_admin(client, db_session, almacen_user, autenticar):
    empleado = _crear_empleado(db_session)
    autenticar(almacen_user)
    resp = client.get(f"/api/v1/rrhh/empleados/{empleado.id}/acceso")
    assert resp.status_code == 403


def test_acceso_permite_admin(client, db_session, admin_user, autenticar):
    empleado = _crear_empleado(db_session)
    autenticar(admin_user)
    resp = client.get(f"/api/v1/rrhh/empleados/{empleado.id}/acceso")
    assert resp.status_code == 200
    assert resp.json() == {"tiene_acceso": False, "email": None}


# ---------- Reglas de negocio (contra el service, con la Admin API mockeada) ----------


@patch("app.services.empleado_acceso_service.crear_usuario_auth")
def test_crear_acceso_asigna_rol_empleado_y_vincula(mock_crear, db_session):
    _asegurar_rol_empleado(db_session)
    mock_crear.return_value = {"id": "fake-auth-uuid-123"}
    empleado = _crear_empleado(db_session)
    _simular_trigger_signup(db_session, "fake-auth-uuid-123", "juan@test.com")

    resultado = EmpleadoAccesoService(db_session).crear_acceso(empleado.id, "juan@test.com", "temporal123")

    assert resultado == {"tiene_acceso": True, "email": "juan@test.com"}
    usuario = UsuarioRepository(db_session).get_by_empleado_id(empleado.id)
    assert usuario is not None
    assert usuario.email == "juan@test.com"
    assert UsuarioRepository(db_session).get_roles(usuario.id) == ["empleado"]


@patch("app.services.empleado_acceso_service.crear_usuario_auth")
def test_crear_acceso_ya_tiene_acceso_rechaza(mock_crear, db_session):
    _asegurar_rol_empleado(db_session)
    empleado = _crear_empleado(db_session)
    mock_crear.return_value = {"id": "auth-1"}
    _simular_trigger_signup(db_session, "auth-1", "primero@test.com")
    EmpleadoAccesoService(db_session).crear_acceso(empleado.id, "primero@test.com", "temporal123")

    with pytest.raises(ValidationError):
        EmpleadoAccesoService(db_session).crear_acceso(empleado.id, "segundo@test.com", "temporal123")


@patch("app.services.empleado_acceso_service.crear_usuario_auth")
def test_crear_acceso_password_corta_rechaza(mock_crear, db_session):
    empleado = _crear_empleado(db_session)
    with pytest.raises(ValidationError):
        EmpleadoAccesoService(db_session).crear_acceso(empleado.id, "juan@test.com", "123")
    mock_crear.assert_not_called()


@patch("app.services.empleado_acceso_service.crear_usuario_auth")
def test_crear_acceso_email_ya_registrado_propaga_error(mock_crear, db_session):
    empleado = _crear_empleado(db_session)
    mock_crear.side_effect = ValidationError("Ya existe una cuenta con el correo juan@test.com")
    with pytest.raises(ValidationError):
        EmpleadoAccesoService(db_session).crear_acceso(empleado.id, "juan@test.com", "temporal123")


@patch("app.services.empleado_acceso_service.crear_usuario_auth")
def test_crear_acceso_usuario_no_aparece_tras_trigger_lanza_error_claro(mock_crear, db_session):
    """Si Supabase Auth crea el usuario pero el trigger no corrió (o corrió
    contra otra base), el servicio no debe fallar en silencio."""
    empleado = _crear_empleado(db_session)
    mock_crear.return_value = {"id": "auth-nunca-aparece"}
    with pytest.raises(AppException):
        EmpleadoAccesoService(db_session).crear_acceso(empleado.id, "juan@test.com", "temporal123")


def test_crear_acceso_empleado_inexistente_rechaza(db_session):
    with pytest.raises(NotFoundError):
        EmpleadoAccesoService(db_session).crear_acceso(9999, "juan@test.com", "temporal123")
