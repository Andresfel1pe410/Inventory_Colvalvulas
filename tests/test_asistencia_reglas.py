"""Pruebas de las 5 reglas de negocio de asistencia (AsistenciaService)."""
from datetime import date, datetime, time, timedelta, timezone

import pytest

from app.core.exceptions import ValidationError
from app.models import Empleado, EventoAsistencia
from app.services.asistencia_service import COLOMBIA_TZ, AsistenciaService


def _crear_empleado(db_session, fingerprint_id: int | None = None) -> Empleado:
    empleado = Empleado(nombre="Juan Perez", documento="123456", fingerprint_id=fingerprint_id)
    db_session.add(empleado)
    db_session.commit()
    db_session.refresh(empleado)
    return empleado


def _a_utc_naive(dt_colombia: datetime) -> datetime:
    return dt_colombia.astimezone(timezone.utc).replace(tzinfo=None)


def _hace_sin_cruzar_medianoche(delta: timedelta) -> tuple[datetime, timedelta]:
    """Devuelve (timestamp UTC naive, delta realmente usado) de un instante
    `delta` atrás en hora Colombia — pero si eso cruzara a "ayer" (el test
    corriendo de madrugada), se recorta a "desde la medianoche de hoy" en vez
    de cruzar el día, para que el resultado no dependa de a qué hora real
    corra la prueba."""
    ahora = datetime.now(COLOMBIA_TZ)
    inicio = ahora - delta
    if inicio.date() != ahora.date():
        inicio = datetime.combine(ahora.date(), time.min, tzinfo=COLOMBIA_TZ)
        delta = ahora - inicio
    return _a_utc_naive(inicio), delta


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
        "horas_semana": 0.0,
        "horas_objetivo": 42.0,
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


def test_horas_semana_suma_tramos_y_resta_descansos(db_session):
    """9h de jornada con 1h de almuerzo = 8h trabajadas, no 9h.

    Se ancla en el día calendario ANTERIOR (siempre 100% en el pasado, sin
    importar a qué hora real corra la prueba) para no cruzar la medianoche
    de hoy dentro del mismo turno — el resumen agrupa eventos por día
    calendario (hora Colombia), así que un turno que cruce de día partiría
    en dos y el total saldría mal. `semana_inicio` apunta a ese mismo día
    para no depender de en qué semana caiga "hoy" (ej. si hoy es lunes)."""
    empleado = _crear_empleado(db_session, fingerprint_id=40)
    ayer = (datetime.now(COLOMBIA_TZ) - timedelta(days=1)).date()
    inicio_dia = datetime.combine(ayer, time(8, 0), tzinfo=COLOMBIA_TZ)
    db_session.add_all(
        [
            EventoAsistencia(empleado_id=empleado.id, tipo_evento="ENTRY", timestamp=_a_utc_naive(inicio_dia)),
            EventoAsistencia(
                empleado_id=empleado.id,
                tipo_evento="LUNCH_START",
                timestamp=_a_utc_naive(inicio_dia + timedelta(hours=4)),
            ),
            EventoAsistencia(
                empleado_id=empleado.id,
                tipo_evento="LUNCH_END",
                timestamp=_a_utc_naive(inicio_dia + timedelta(hours=5)),
            ),
            EventoAsistencia(
                empleado_id=empleado.id, tipo_evento="EXIT", timestamp=_a_utc_naive(inicio_dia + timedelta(hours=9))
            ),
        ]
    )
    db_session.commit()

    service = AsistenciaService(db_session)
    resultado = service.horas_semana_empleado(empleado.id, semana_inicio=ayer)
    assert resultado["horas_trabajadas"] == 8.0
    assert resultado["horas_objetivo"] == 42.0
    assert resultado["dias_trabajados"] == 1
    assert resultado["promedio_horas_dia"] == 8.0
    assert resultado["promedio_almuerzo_min"] == 60.0


def test_horas_semana_cuenta_tramo_abierto_hasta_ahora(db_session):
    """Si el empleado sigue trabajando (sin EXIT), las horas se cuentan hasta el momento actual."""
    empleado = _crear_empleado(db_session, fingerprint_id=41)
    inicio, delta_usado = _hace_sin_cruzar_medianoche(timedelta(hours=2))
    db_session.add(EventoAsistencia(empleado_id=empleado.id, tipo_evento="ENTRY", timestamp=inicio))
    db_session.commit()

    service = AsistenciaService(db_session)
    resultado = service.horas_semana_empleado(empleado.id)
    horas_esperadas = delta_usado.total_seconds() / 3600
    assert abs(resultado["horas_trabajadas"] - horas_esperadas) < 0.05


def _evento_colombia(empleado_id: int, tipo: str, dia: date, hora: time) -> EventoAsistencia:
    ts_colombia = datetime.combine(dia, hora, tzinfo=COLOMBIA_TZ)
    return EventoAsistencia(empleado_id=empleado_id, tipo_evento=tipo, timestamp=_a_utc_naive(ts_colombia))


def test_horas_semana_pasada_ignora_otras_semanas_y_promedia_dias(db_session):
    """Se puede consultar una semana pasada (no solo la actual, `semana_inicio`)
    y los promedios de horas/desayuno/almuerzo salen del promedio de los días
    trabajados esa semana, sin mezclar datos de otra semana."""
    empleado = _crear_empleado(db_session, fingerprint_id=50)
    hoy = datetime.now(COLOMBIA_TZ).date()
    lunes_objetivo = (hoy - timedelta(days=hoy.weekday())) - timedelta(days=14)
    dia1 = lunes_objetivo + timedelta(days=1)
    dia2 = lunes_objetivo + timedelta(days=2)

    eventos = [
        _evento_colombia(empleado.id, "ENTRY", dia1, time(8, 0)),
        _evento_colombia(empleado.id, "BREAKFAST_START", dia1, time(10, 0)),
        _evento_colombia(empleado.id, "BREAKFAST_END", dia1, time(10, 15)),
        _evento_colombia(empleado.id, "LUNCH_START", dia1, time(12, 0)),
        _evento_colombia(empleado.id, "LUNCH_END", dia1, time(13, 0)),
        _evento_colombia(empleado.id, "EXIT", dia1, time(17, 0)),
        _evento_colombia(empleado.id, "ENTRY", dia2, time(8, 0)),
        _evento_colombia(empleado.id, "BREAKFAST_START", dia2, time(10, 0)),
        _evento_colombia(empleado.id, "BREAKFAST_END", dia2, time(10, 10)),
        _evento_colombia(empleado.id, "LUNCH_START", dia2, time(12, 0)),
        _evento_colombia(empleado.id, "LUNCH_END", dia2, time(12, 30)),
        _evento_colombia(empleado.id, "EXIT", dia2, time(16, 0)),
        # Evento en OTRA semana (la actual) que no debe mezclarse con lo anterior.
        _evento_colombia(empleado.id, "ENTRY", hoy, time(8, 0)),
    ]
    db_session.add_all(eventos)
    db_session.commit()

    service = AsistenciaService(db_session)
    resultado = service.horas_semana_empleado(empleado.id, semana_inicio=lunes_objetivo)

    horas_dia1 = 9 - 0.25 - 1  # 8am-5pm, 15min desayuno, 1h almuerzo
    horas_dia2 = 8 - (10 / 60) - 0.5  # 8am-4pm, 10min desayuno, 30min almuerzo

    assert resultado["semana_inicio"] == lunes_objetivo
    assert resultado["semana_fin"] == lunes_objetivo + timedelta(days=6)
    assert resultado["dias_trabajados"] == 2
    assert resultado["horas_trabajadas"] == pytest.approx(horas_dia1 + horas_dia2, abs=0.02)
    assert resultado["promedio_horas_dia"] == pytest.approx((horas_dia1 + horas_dia2) / 2, abs=0.02)
    assert resultado["promedio_desayuno_min"] == pytest.approx(12.5, abs=0.1)
    assert resultado["promedio_almuerzo_min"] == pytest.approx(45.0, abs=0.1)


def test_horas_semana_todos_acepta_semana_pasada(db_session):
    empleado = _crear_empleado(db_session, fingerprint_id=51)
    hoy = datetime.now(COLOMBIA_TZ).date()
    lunes_objetivo = (hoy - timedelta(days=hoy.weekday())) - timedelta(days=7)
    db_session.add(_evento_colombia(empleado.id, "ENTRY", lunes_objetivo, time(8, 0)))
    db_session.commit()

    service = AsistenciaService(db_session)
    resultados = service.horas_semana_todos(semana_inicio=lunes_objetivo)
    fila = next(r for r in resultados if r["empleado_id"] == empleado.id)
    assert fila["semana_inicio"] == lunes_objetivo
    assert fila["dias_trabajados"] == 1


def test_horas_semana_no_falla_con_timestamp_timezone_aware(db_session):
    """En Postgres (producción) la columna timestamp es timezone-aware; en
    SQLite (tests) normalmente llega naive. La primera marcada de la semana
    (un único ENTRY sin cerrar) reproducía un TypeError al restar aware-naive."""
    empleado = _crear_empleado(db_session, fingerprint_id=42)
    inicio_naive, delta_usado = _hace_sin_cruzar_medianoche(timedelta(hours=1))
    inicio = inicio_naive.replace(tzinfo=timezone.utc)
    db_session.add(EventoAsistencia(empleado_id=empleado.id, tipo_evento="ENTRY", timestamp=inicio))
    db_session.commit()

    service = AsistenciaService(db_session)
    resultado = service.horas_semana_empleado(empleado.id)
    horas_esperadas = delta_usado.total_seconds() / 3600
    assert abs(resultado["horas_trabajadas"] - horas_esperadas) < 0.05
