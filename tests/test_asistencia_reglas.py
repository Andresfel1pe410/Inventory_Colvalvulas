"""Pruebas de las 5 reglas de negocio de asistencia (AsistenciaService)."""
from datetime import datetime, timedelta

import pytest

from app.core.exceptions import ValidationError
from app.models import Empleado, EventoAsistencia
from app.services.asistencia_service import AsistenciaService


def _crear_empleado(db_session, fingerprint_id: int | None = None) -> Empleado:
    empleado = Empleado(nombre="Juan Perez", documento="123456", fingerprint_id=fingerprint_id)
    db_session.add(empleado)
    db_session.commit()
    db_session.refresh(empleado)
    return empleado


def test_dos_entradas_seguidas_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = AsistenciaService(db_session)
    service.registrar_evento(empleado.id, "ENTRY")
    with pytest.raises(ValidationError):
        service.registrar_evento(empleado.id, "ENTRY")


def test_dos_salidas_seguidas_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = AsistenciaService(db_session)
    service.registrar_evento(empleado.id, "ENTRY")
    service.registrar_evento(empleado.id, "EXIT")
    with pytest.raises(ValidationError):
        service.registrar_evento(empleado.id, "EXIT")


def test_finalizar_almuerzo_sin_iniciarlo_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = AsistenciaService(db_session)
    service.registrar_evento(empleado.id, "ENTRY")
    with pytest.raises(ValidationError):
        service.registrar_evento(empleado.id, "LUNCH_END")


def test_finalizar_desayuno_sin_iniciarlo_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = AsistenciaService(db_session)
    service.registrar_evento(empleado.id, "ENTRY")
    with pytest.raises(ValidationError):
        service.registrar_evento(empleado.id, "BREAKFAST_END")


def test_salir_sin_entrada_rechaza(db_session):
    empleado = _crear_empleado(db_session)
    service = AsistenciaService(db_session)
    with pytest.raises(ValidationError):
        service.registrar_evento(empleado.id, "EXIT")


def test_secuencia_completa_valida(db_session):
    empleado = _crear_empleado(db_session)
    service = AsistenciaService(db_session)
    service.registrar_evento(empleado.id, "ENTRY")
    service.registrar_evento(empleado.id, "BREAKFAST_START")
    service.registrar_evento(empleado.id, "BREAKFAST_END")
    service.registrar_evento(empleado.id, "LUNCH_START")
    service.registrar_evento(empleado.id, "LUNCH_END")
    evento = service.registrar_evento(empleado.id, "EXIT")
    assert evento.tipo_evento == "EXIT"


def test_reset_diario_no_bloquea_por_evento_de_ayer(db_session):
    """Un ENTRY de ayer sin EXIT no debe bloquear un ENTRY hoy."""
    empleado = _crear_empleado(db_session)
    ayer = datetime.utcnow() - timedelta(days=1)
    db_session.add(EventoAsistencia(empleado_id=empleado.id, tipo_evento="ENTRY", timestamp=ayer))
    db_session.commit()

    service = AsistenciaService(db_session)
    evento = service.registrar_evento(empleado.id, "ENTRY")
    assert evento.tipo_evento == "ENTRY"


def test_registrar_evento_dispositivo_huella_no_reconocida_no_lanza_excepcion(db_session):
    service = AsistenciaService(db_session)
    resultado = service.registrar_evento_dispositivo(fingerprint_id=999, device_id=1)
    assert resultado["success"] is False
    assert resultado["employee_name"] is None


def test_registrar_evento_dispositivo_exitoso(db_session):
    empleado = _crear_empleado(db_session, fingerprint_id=20)
    service = AsistenciaService(db_session)
    resultado = service.registrar_evento_dispositivo(fingerprint_id=20, device_id=1)
    assert resultado == {
        "success": True,
        "employee_name": "Juan Perez",
        "message": "Entrada registrada",
        "event_type": "ENTRY",
    }


def test_registrar_evento_dispositivo_avanza_secuencia_automaticamente(db_session):
    """Sin mandar 'event': cada scan avanza al siguiente evento de la secuencia."""
    empleado = _crear_empleado(db_session, fingerprint_id=21)
    service = AsistenciaService(db_session)

    secuencia_esperada = ["ENTRY", "BREAKFAST_START", "BREAKFAST_END", "LUNCH_START", "LUNCH_END", "EXIT"]
    for esperado in secuencia_esperada:
        resultado = service.registrar_evento_dispositivo(fingerprint_id=21, device_id=1)
        assert resultado["success"] is True
        assert resultado["event_type"] == esperado

    # Ya completó todos los eventos del día: el siguiente scan no registra nada.
    resultado = service.registrar_evento_dispositivo(fingerprint_id=21, device_id=1)
    assert resultado["success"] is False
    assert resultado["event_type"] is None


def test_solo_entrada_salida_usa_secuencia_corta(db_session):
    """Gerente/jefe de almacén (solo_entrada_salida=True) saltan directo de ENTRY a EXIT."""
    empleado = Empleado(nombre="Gerente Uno", documento="999", fingerprint_id=30, solo_entrada_salida=True)
    db_session.add(empleado)
    db_session.commit()

    service = AsistenciaService(db_session)
    r1 = service.registrar_evento_dispositivo(fingerprint_id=30, device_id=1)
    assert r1["event_type"] == "ENTRY"

    r2 = service.registrar_evento_dispositivo(fingerprint_id=30, device_id=1)
    assert r2["event_type"] == "EXIT"

    r3 = service.registrar_evento_dispositivo(fingerprint_id=30, device_id=1)
    assert r3["success"] is False
