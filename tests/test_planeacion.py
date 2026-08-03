"""Pruebas de Planeación: dependencias, empleados asignados y tareas."""
import pytest

from app.core.exceptions import NotFoundError, ValidationError
from app.models import Empleado
from app.services.planeacion_service import PlaneacionService


def _crear_empleado(db_session, nombre="Juan Perez", documento="123456", activo=True) -> Empleado:
    empleado = Empleado(nombre=nombre, documento=documento, activo=activo)
    db_session.add(empleado)
    db_session.commit()
    db_session.refresh(empleado)
    return empleado


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
        json={"empleado_id": empleado.id, "descripcion": "Cortar lámina"},
    )
    assert resp.status_code == 201
    tarea_id = resp.json()["id"]
    assert resp.json()["estado"] == "pendiente"

    resp = client.patch(
        f"/api/v1/proceso/planeacion/dependencias/{dependencia_id}/tareas/{tarea_id}",
        json={"estado": "en_progreso"},
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "en_progreso"

    resp = client.get(f"/api/v1/proceso/planeacion/dependencias/{dependencia_id}")
    assert resp.status_code == 200
    detalle = resp.json()
    assert detalle["nombre"] == "Corte"
    assert len(detalle["empleados"]) == 1
    assert detalle["empleados"][0]["empleado_id"] == empleado.id
    assert len(detalle["empleados"][0]["tareas"]) == 1
    assert detalle["empleados"][0]["tareas"][0]["estado"] == "en_progreso"
