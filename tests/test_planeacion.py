"""Pruebas de Planeación: dependencias, empleados asignados y tareas."""
import pytest

from app.core.exceptions import NotFoundError, ValidationError
from app.models import Empleado, Rol, Usuario, UsuarioRol
from app.services.planeacion_service import PlaneacionService


def _crear_empleado(db_session, nombre="Juan Perez", documento="123456", activo=True) -> Empleado:
    empleado = Empleado(nombre=nombre, documento=documento, activo=activo)
    db_session.add(empleado)
    db_session.commit()
    db_session.refresh(empleado)
    return empleado


def _crear_usuario_empleado(db_session, empleado: Empleado | None, email: str) -> Usuario:
    """Usuario con rol 'empleado', vinculado (o no) a una ficha de RRHH --
    igual a como quedaría tras EmpleadoAccesoService.crear_acceso()."""
    rol = db_session.query(Rol).filter_by(nombre="empleado").first()
    if not rol:
        rol = Rol(nombre="empleado", descripcion="empleado")
        db_session.add(rol)
        db_session.flush()
    usuario = Usuario(
        auth_user_id=f"auth-{email}",
        email=email,
        nombre="Test",
        activo=True,
        empleado_id=empleado.id if empleado else None,
    )
    db_session.add(usuario)
    db_session.flush()
    db_session.add(UsuarioRol(usuario_id=usuario.id, rol_id=rol.id))
    db_session.commit()
    db_session.refresh(usuario)
    return usuario


# ---------- Permisos (Planeación es admin-only, a diferencia de inventario-proceso) ----------


def test_planeacion_rechaza_sin_autenticar(client):
    resp = client.get("/api/v1/proceso/planeacion/dependencias")
    assert resp.status_code == 401


def test_planeacion_rechaza_almacen(client, almacen_user, autenticar):
    autenticar(almacen_user)
    resp = client.get("/api/v1/proceso/planeacion/dependencias")
    assert resp.status_code == 403


def test_planeacion_rechaza_vendedor(client, vendedor_user, autenticar):
    autenticar(vendedor_user)
    resp = client.get("/api/v1/proceso/planeacion/dependencias")
    assert resp.status_code == 403


def test_planeacion_permite_admin(client, admin_user, autenticar):
    autenticar(admin_user)
    resp = client.get("/api/v1/proceso/planeacion/dependencias")
    assert resp.status_code == 200


# ---------- Reglas de negocio (contra el service, directo con db_session) ----------


def test_crear_dependencia_nombre_vacio_rechaza(db_session):
    service = PlaneacionService(db_session)
    with pytest.raises(ValidationError):
        service.crear_dependencia("   ", [])


def test_crear_dependencia_empleado_inexistente_rechaza(db_session):
    service = PlaneacionService(db_session)
    with pytest.raises(ValidationError):
        service.crear_dependencia("Corte", [9999])


def test_crear_dependencia_empleado_inactivo_rechaza(db_session):
    empleado = _crear_empleado(db_session, activo=False)
    service = PlaneacionService(db_session)
    with pytest.raises(ValidationError):
        service.crear_dependencia("Corte", [empleado.id])


def test_agregar_empleado_duplicado_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia = service.crear_dependencia("Corte", [empleado.id])
    with pytest.raises(ValidationError):
        service.agregar_empleado(dependencia.id, empleado.id)


def test_crear_tarea_empleado_no_asignado_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia = service.crear_dependencia("Corte", [])
    with pytest.raises(ValidationError):
        service.crear_tarea(dependencia.id, empleado.id, "Cortar lámina")


def test_crear_tarea_estado_inicial_pendiente(db_session):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia = service.crear_dependencia("Corte", [empleado.id])
    tarea = service.crear_tarea(dependencia.id, empleado.id, "Cortar lámina")
    assert tarea.estado == "pendiente"


def test_actualizar_estado_tarea_valor_invalido_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia = service.crear_dependencia("Corte", [empleado.id])
    tarea = service.crear_tarea(dependencia.id, empleado.id, "Cortar lámina")
    with pytest.raises(ValidationError):
        service.actualizar_estado_tarea(dependencia.id, tarea.id, "no_existe")


@pytest.mark.parametrize("estado", ["pendiente", "en_progreso", "hecha"])
def test_actualizar_estado_tarea_cada_valor_valido(db_session, estado):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia = service.crear_dependencia("Corte", [empleado.id])
    tarea = service.crear_tarea(dependencia.id, empleado.id, "Cortar lámina")
    actualizada = service.actualizar_estado_tarea(dependencia.id, tarea.id, estado)
    assert actualizada.estado == estado


def test_eliminar_tarea_la_quita_de_la_dependencia(db_session):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia = service.crear_dependencia("Corte", [empleado.id])
    tarea = service.crear_tarea(dependencia.id, empleado.id, "Cortar lámina")

    service.eliminar_tarea(dependencia.id, tarea.id)

    assert service.repo.get_tarea(tarea.id) is None


def test_eliminar_tarea_inexistente_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia = service.crear_dependencia("Corte", [empleado.id])
    with pytest.raises(NotFoundError):
        service.eliminar_tarea(dependencia.id, 9999)


def test_eliminar_tarea_de_otra_dependencia_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia_a = service.crear_dependencia("Corte", [empleado.id])
    dependencia_b = service.crear_dependencia("Soldadura", [empleado.id])
    tarea = service.crear_tarea(dependencia_a.id, empleado.id, "Cortar lámina")
    with pytest.raises(NotFoundError):
        service.eliminar_tarea(dependencia_b.id, tarea.id)


def test_quitar_empleado_no_asignado_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia = service.crear_dependencia("Corte", [])
    with pytest.raises(NotFoundError):
        service.quitar_empleado(dependencia.id, empleado.id)


def test_quitar_empleado_conserva_tareas_existentes(db_session):
    empleado = _crear_empleado(db_session)
    service = PlaneacionService(db_session)
    dependencia = service.crear_dependencia("Corte", [empleado.id])
    service.crear_tarea(dependencia.id, empleado.id, "Cortar lámina")

    service.quitar_empleado(dependencia.id, empleado.id)

    detalle = service.obtener_detalle(dependencia.id)
    assert not any(e["empleado_id"] == empleado.id for e in detalle["empleados"])
    tareas = service.repo.get_tareas_de_dependencia(dependencia.id)
    assert len(tareas) == 1
    assert tareas[0].descripcion == "Cortar lámina"


# ---------- Flujo feliz end-to-end (vía HTTP, como admin) ----------


def test_flujo_completo_dependencia_tarea(client, admin_user, autenticar, db_session):
    autenticar(admin_user)
    empleado = _crear_empleado(db_session)

    resp = client.post(
        "/api/v1/proceso/planeacion/dependencias",
        json={"nombre": "Corte", "empleado_ids": [empleado.id]},
    )
    assert resp.status_code == 201
    dependencia_id = resp.json()["id"]

    resp = client.post(
        f"/api/v1/proceso/planeacion/dependencias/{dependencia_id}/tareas",
        json={"empleado_id": empleado.id, "descripcion": "Cortar lámina", "cantidad": 20},
    )
    assert resp.status_code == 201
    tarea_id = resp.json()["id"]
    assert resp.json()["estado"] == "pendiente"
    assert resp.json()["cantidad"] == 20
    assert resp.json()["realizado"] == 0

    resp = client.patch(
        f"/api/v1/proceso/planeacion/dependencias/{dependencia_id}/tareas/{tarea_id}",
        json={"estado": "en_progreso", "realizado": 5},
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "en_progreso"
    assert resp.json()["realizado"] == 5

    resp = client.get(f"/api/v1/proceso/planeacion/dependencias/{dependencia_id}")
    assert resp.status_code == 200
    detalle = resp.json()
    assert detalle["nombre"] == "Corte"
    assert len(detalle["empleados"]) == 1
    assert detalle["empleados"][0]["empleado_id"] == empleado.id
    assert len(detalle["empleados"][0]["tareas"]) == 1
    assert detalle["empleados"][0]["tareas"][0]["estado"] == "en_progreso"
    assert detalle["empleados"][0]["tareas"][0]["cantidad"] == 20
    assert detalle["empleados"][0]["tareas"][0]["realizado"] == 5

    resp = client.delete(f"/api/v1/proceso/planeacion/dependencias/{dependencia_id}/tareas/{tarea_id}")
    assert resp.status_code == 204

    resp = client.get(f"/api/v1/proceso/planeacion/dependencias/{dependencia_id}")
    assert resp.json()["empleados"][0]["tareas"] == []


# ---------- Mis tareas (autoservicio del empleado) ----------


def test_mis_tareas_rechaza_sin_autenticar(client):
    resp = client.get("/api/v1/proceso/planeacion/mis-tareas")
    assert resp.status_code == 401


def test_mis_tareas_rechaza_admin(client, admin_user, autenticar):
    """Admin no tiene el rol 'empleado' -- mis-tareas es solo para ese rol."""
    autenticar(admin_user)
    resp = client.get("/api/v1/proceso/planeacion/mis-tareas")
    assert resp.status_code == 403


def test_mis_tareas_permite_empleado(client, db_session, autenticar):
    empleado = _crear_empleado(db_session)
    usuario = _crear_usuario_empleado(db_session, empleado, "juan@test.com")
    autenticar(usuario)
    resp = client.get("/api/v1/proceso/planeacion/mis-tareas")
    assert resp.status_code == 200
    assert resp.json() == []


def test_mis_tareas_404_si_no_tiene_empleado_vinculado(client, db_session, autenticar):
    usuario = _crear_usuario_empleado(db_session, None, "sinvinculo@test.com")
    autenticar(usuario)
    resp = client.get("/api/v1/proceso/planeacion/mis-tareas")
    assert resp.status_code == 404


def test_mis_tareas_aislamiento(client, db_session, autenticar):
    """Un empleado no ve ni puede tocar las tareas de otro."""
    service = PlaneacionService(db_session)
    empleado_a = _crear_empleado(db_session, nombre="A", documento="AAA")
    empleado_b = _crear_empleado(db_session, nombre="B", documento="BBB")
    dependencia = service.crear_dependencia("Corte", [empleado_a.id, empleado_b.id])
    tarea_a = service.crear_tarea(dependencia.id, empleado_a.id, "Tarea de A")
    tarea_b = service.crear_tarea(dependencia.id, empleado_b.id, "Tarea de B")

    usuario_a = _crear_usuario_empleado(db_session, empleado_a, "a@test.com")
    autenticar(usuario_a)

    resp = client.get("/api/v1/proceso/planeacion/mis-tareas")
    assert resp.status_code == 200
    ids = [t["id"] for t in resp.json()]
    assert ids == [tarea_a.id]

    resp = client.patch(
        f"/api/v1/proceso/planeacion/mis-tareas/{tarea_b.id}",
        json={"estado": "en_progreso"},
    )
    assert resp.status_code == 404


def test_mis_tareas_actualizar_estado_incluye_nombre_dependencia(client, db_session, autenticar):
    service = PlaneacionService(db_session)
    empleado = _crear_empleado(db_session)
    dependencia = service.crear_dependencia("Soldadura", [empleado.id])
    tarea = service.crear_tarea(dependencia.id, empleado.id, "Soldar base")

    usuario = _crear_usuario_empleado(db_session, empleado, "empleado@test.com")
    autenticar(usuario)

    resp = client.patch(
        f"/api/v1/proceso/planeacion/mis-tareas/{tarea.id}",
        json={"estado": "hecha"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["estado"] == "hecha"
    assert data["dependencia_nombre"] == "Soldadura"


def test_actualizar_estado_tarea_de_empleado_valor_invalido_rechaza(db_session):
    service = PlaneacionService(db_session)
    empleado = _crear_empleado(db_session)
    dependencia = service.crear_dependencia("Corte", [empleado.id])
    tarea = service.crear_tarea(dependencia.id, empleado.id, "Cortar")
    with pytest.raises(ValidationError):
        service.actualizar_estado_tarea_de_empleado(empleado.id, tarea.id, "no_existe")


def test_actualizar_estado_tarea_de_empleado_tarea_ajena_rechaza(db_session):
    service = PlaneacionService(db_session)
    empleado_a = _crear_empleado(db_session, nombre="A", documento="AAA2")
    empleado_b = _crear_empleado(db_session, nombre="B", documento="BBB2")
    dependencia = service.crear_dependencia("Corte", [empleado_a.id, empleado_b.id])
    tarea_b = service.crear_tarea(dependencia.id, empleado_b.id, "Tarea de B")
    with pytest.raises(NotFoundError):
        service.actualizar_estado_tarea_de_empleado(empleado_a.id, tarea_b.id, "hecha")
