"""Servicio de asistencia: registro de eventos, reglas de negocio y estado del día."""
from datetime import date, datetime, time, timedelta, timezone

from app.core.exceptions import NotFoundError, ValidationError
from app.models import Empleado, EventoAsistencia
from app.repositories.asistencia_repository import AsistenciaRepository
from app.repositories.empleado_repository import EmpleadoRepository
from app.schemas import TIPOS_EVENTO_ASISTENCIA

# Secuencia automática del dispositivo: el ESP32 no manda qué evento es, solo
# quién puso el dedo. El backend calcula el siguiente evento según en qué punto
# de la secuencia va el empleado hoy. Gerente/jefe de almacén (solo_entrada_salida)
# usan la secuencia corta; el resto, la completa.
SECUENCIA_COMPLETA = ["ENTRY", "BREAKFAST_START", "BREAKFAST_END", "LUNCH_START", "LUNCH_END", "EXIT"]
SECUENCIA_SIMPLIFICADA = ["ENTRY", "EXIT"]

# Colombia no tiene horario de verano: offset fijo. El servidor corre en UTC
# (Railway), así que "hoy" y la hora límite de entrada deben calcularse en hora
# local, no en la del servidor.
COLOMBIA_TZ = timezone(timedelta(hours=-5))
HORA_LIMITE_ENTRADA = time(7, 0)

# Si un empleado no marca salida, al cambiar de día (medianoche hora
# Colombia) se le asume la salida a esta hora del día anterior — es la hora
# real de salida de la mayoría de empleados según el historial, más
# representativa que adivinar a las 8pm. Antes ese día quedaba en 0 horas/
# excluido de los promedios, lo cual distorsionaba las métricas igual o peor.
HORA_SALIDA_AUTOMATICA = time(16, 30)
DIAS_ATRAS_CIERRE_AUTOMATICO = 60

# El lector de huella a veces queda "marcado" con el dedo (residuo óptico o
# el dedo no se levantó a tiempo) y el ESP32 manda varias peticiones seguidas
# para la misma persona en segundos. Se ignora cualquier marca nueva si la
# última de ese empleado fue hace menos de este tiempo.
TIEMPO_MINIMO_ENTRE_EVENTOS = timedelta(minutes=10)

# Jornada legal semanal en Colombia (Ley 2101 de 2021, reducción gradual a 42h).
HORAS_OBJETIVO_SEMANAL = 42.0

# Eventos que abren/cierran un tramo de trabajo, usados para sumar horas.
EVENTOS_INICIO_TRAMO = {"ENTRY", "BREAKFAST_END", "LUNCH_END"}
EVENTOS_FIN_TRAMO = {"BREAKFAST_START", "LUNCH_START", "EXIT"}

ESTADO_POR_ULTIMO_EVENTO = {
    None: "ausente",
    "ENTRY": "presente",
    "BREAKFAST_START": "en_desayuno",
    "BREAKFAST_END": "presente",
    "LUNCH_START": "en_almuerzo",
    "LUNCH_END": "presente",
    "EXIT": "salida",
}

MENSAJE_EVENTO = {
    "ENTRY": "Entrada registrada",
    "BREAKFAST_START": "Inicio de desayuno registrado",
    "BREAKFAST_END": "Fin de desayuno registrado",
    "LUNCH_START": "Inicio de almuerzo registrado",
    "LUNCH_END": "Fin de almuerzo registrado",
    "EXIT": "Salida registrada",
}


def _hoy_colombia() -> date:
    return datetime.now(COLOMBIA_TZ).date()


def _rango_dia_colombia(dia: date) -> tuple[datetime, datetime]:
    """Límites UTC (naive, mismo criterio que el resto del proyecto) del día
    calendario `dia` en hora de Colombia, para filtrar timestamps guardados en UTC."""
    inicio_local = datetime.combine(dia, time.min, tzinfo=COLOMBIA_TZ)
    fin_local = datetime.combine(dia, time.max, tzinfo=COLOMBIA_TZ)
    return inicio_local.astimezone(timezone.utc).replace(tzinfo=None), fin_local.astimezone(timezone.utc).replace(tzinfo=None)


def _lunes_de(dia: date) -> date:
    return dia - timedelta(days=dia.weekday())


def _rango_semana(semana_inicio: date | None) -> tuple[datetime, datetime, date, date]:
    """Límites UTC (naive) de la semana que empieza en `semana_inicio` (se
    ajusta al lunes de esa fecha si no cae justo ahí). Si es la semana actual,
    el fin es "ahora" (para que el tramo de hoy cuente en tiempo real); si es
    una semana pasada, el fin es el domingo 23:59 de esa semana (ya cerrada).
    Devuelve también el lunes/domingo calendario, para mostrar el rango en
    el reporte sin importar hasta dónde llegan los datos."""
    hoy = _hoy_colombia()
    lunes_actual = _lunes_de(hoy)
    lunes = _lunes_de(semana_inicio) if semana_inicio else lunes_actual
    domingo = lunes + timedelta(days=6)

    dt_inicio, _ = _rango_dia_colombia(lunes)
    if lunes == lunes_actual:
        dt_fin = datetime.now(timezone.utc).replace(tzinfo=None)
    else:
        _, dt_fin = _rango_dia_colombia(domingo)
    return dt_inicio, dt_fin, lunes, domingo


def _horas_trabajadas(eventos: list[EventoAsistencia], ahora_utc: datetime) -> float:
    """Suma las horas trabajadas a partir de una lista de eventos ya ordenada
    por timestamp: ENTRY/BREAKFAST_END/LUNCH_END abren un tramo de trabajo,
    BREAKFAST_START/LUNCH_START/EXIT lo cierran. Si el último tramo quedó
    abierto (el empleado sigue trabajando y no ha marcado salida), se cuenta
    hasta `ahora_utc` para que el avance se vea en tiempo real.

    Normaliza todo a UTC-aware antes de restar: en Postgres (producción) la
    columna timestamp es timezone-aware, pero en SQLite (tests) llega naive.
    Restar un datetime aware menos uno naive lanza TypeError — eso rompía la
    primera marcada de la semana (el único evento, sin cerrar todavía, cae en
    la rama final que resta contra "ahora")."""
    ahora = _a_utc_aware(ahora_utc)
    total_segundos = 0.0
    inicio_tramo: datetime | None = None
    for ev in eventos:
        ts = _a_utc_aware(ev.timestamp)
        if ev.tipo_evento in EVENTOS_INICIO_TRAMO:
            inicio_tramo = ts
        elif ev.tipo_evento in EVENTOS_FIN_TRAMO and inicio_tramo is not None:
            total_segundos += (ts - inicio_tramo).total_seconds()
            inicio_tramo = None
    if inicio_tramo is not None:
        total_segundos += (ahora - inicio_tramo).total_seconds()
    return max(total_segundos, 0.0) / 3600.0


def _duracion_minutos(inicio: EventoAsistencia | None, fin: EventoAsistencia | None) -> float | None:
    if inicio is None or fin is None:
        return None
    return (_a_utc_aware(fin.timestamp) - _a_utc_aware(inicio.timestamp)).total_seconds() / 60.0


def _resumen_semana_empleado(eventos_semana: list[EventoAsistencia], hoy: date) -> dict:
    """A partir de los eventos de UN empleado en la semana, arma: horas totales,
    promedio de horas trabajadas por día, y promedio de minutos de desayuno y
    almuerzo — agrupando primero por día calendario (hora Colombia), porque
    una jornada nunca cruza la medianoche y así cada día se puede cerrar con
    su propio corte (el de hoy hasta "ahora", los pasados hasta su último
    evento — no se puede adivinar cuánto trabajó después de su última marca)."""
    por_dia: dict[date, list[EventoAsistencia]] = {}
    for ev in eventos_semana:
        dia_local = _a_utc_aware(ev.timestamp).astimezone(COLOMBIA_TZ).date()
        por_dia.setdefault(dia_local, []).append(ev)

    horas_dias_trabajados: list[float] = []
    desayunos_min: list[float] = []
    almuerzos_min: list[float] = []
    total_horas = 0.0

    for dia, eventos_dia in por_dia.items():
        eventos_dia = sorted(eventos_dia, key=lambda e: e.timestamp)
        corte = datetime.now(timezone.utc) if dia == hoy else eventos_dia[-1].timestamp
        horas_dia = _horas_trabajadas(eventos_dia, corte)
        total_horas += horas_dia
        if any(e.tipo_evento == "ENTRY" for e in eventos_dia):
            horas_dias_trabajados.append(horas_dia)

        por_tipo = {e.tipo_evento: e for e in eventos_dia}
        desayuno = _duracion_minutos(por_tipo.get("BREAKFAST_START"), por_tipo.get("BREAKFAST_END"))
        if desayuno is not None:
            desayunos_min.append(desayuno)
        almuerzo = _duracion_minutos(por_tipo.get("LUNCH_START"), por_tipo.get("LUNCH_END"))
        if almuerzo is not None:
            almuerzos_min.append(almuerzo)

    return {
        "horas_trabajadas": round(total_horas, 2),
        "dias_trabajados": len(horas_dias_trabajados),
        "promedio_horas_dia": round(sum(horas_dias_trabajados) / len(horas_dias_trabajados), 2) if horas_dias_trabajados else 0.0,
        "promedio_desayuno_min": round(sum(desayunos_min) / len(desayunos_min), 1) if desayunos_min else 0.0,
        "promedio_almuerzo_min": round(sum(almuerzos_min) / len(almuerzos_min), 1) if almuerzos_min else 0.0,
    }


def _a_utc_aware(dt: datetime) -> datetime:
    """Normaliza a datetime UTC-aware, sea que el driver haya devuelto un valor
    naive (se asume UTC, igual que el resto del proyecto) o ya con tzinfo."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class AsistenciaService:
    def __init__(self, db):
        self.db = db
        self.repo = AsistenciaRepository(db)
        self.emp_repo = EmpleadoRepository(db)

    def _cerrar_dias_pendientes(self, empleado_id: int | None = None) -> int:
        """Al cambiar de día (medianoche hora Colombia), si un empleado tiene
        ENTRY pero nunca marcó EXIT en un día que ya terminó, se le crea
        automáticamente la salida a las 4:30pm de ese día (hora real de
        salida de la mayoría de empleados según el historial) — antes ese
        día quedaba en 0 horas en las métricas (o efectivamente invisible).
        HOY nunca se toca mientras siga siendo hoy (todavía puede marcar).
        Se llama tanto al marcar un evento como al pedir cualquier reporte,
        para que se autocorrija solo sin depender de que alguien vuelva a
        marcar."""
        hoy = _hoy_colombia()
        desde, _ = _rango_dia_colombia(hoy - timedelta(days=DIAS_ATRAS_CIERRE_AUTOMATICO))

        query = self.db.query(EventoAsistencia).filter(EventoAsistencia.timestamp >= desde)
        if empleado_id is not None:
            query = query.filter(EventoAsistencia.empleado_id == empleado_id)
        eventos = query.order_by(EventoAsistencia.empleado_id, EventoAsistencia.timestamp).all()

        por_empleado_dia: dict[tuple[int, date], set[str]] = {}
        for ev in eventos:
            dia_local = _a_utc_aware(ev.timestamp).astimezone(COLOMBIA_TZ).date()
            if dia_local >= hoy:
                continue  # hoy (o algo a futuro) no se toca todavía
            por_empleado_dia.setdefault((ev.empleado_id, dia_local), set()).add(ev.tipo_evento)

        creados = 0
        for (emp_id, dia), tipos in por_empleado_dia.items():
            if "ENTRY" not in tipos or "EXIT" in tipos:
                continue
            salida_utc = datetime.combine(dia, HORA_SALIDA_AUTOMATICA, tzinfo=COLOMBIA_TZ).astimezone(timezone.utc)
            self.repo.crear_evento(emp_id, "EXIT", device_id=None, timestamp=salida_utc)
            creados += 1

        if creados:
            self.db.commit()
        return creados

    def _validar_transicion(self, ultimo_tipo: str | None, nuevo_tipo: str) -> None:
        if nuevo_tipo == "ENTRY" and ultimo_tipo == "ENTRY":
            raise ValidationError("Ya hay una entrada registrada hoy sin salida")
        if nuevo_tipo == "EXIT" and ultimo_tipo == "EXIT":
            raise ValidationError("Ya se registró la salida hoy")
        if nuevo_tipo == "LUNCH_END" and ultimo_tipo != "LUNCH_START":
            raise ValidationError("No se puede finalizar el almuerzo sin haberlo iniciado")
        if nuevo_tipo == "BREAKFAST_END" and ultimo_tipo != "BREAKFAST_START":
            raise ValidationError("No se puede finalizar el desayuno sin haberlo iniciado")
        if nuevo_tipo == "EXIT" and ultimo_tipo is None:
            raise ValidationError("No se puede registrar salida sin una entrada previa")

    def _siguiente_evento(self, empleado: Empleado, ultimo_tipo: str | None) -> str | None:
        """Calcula el próximo evento de la secuencia automática del empleado.
        Devuelve None si ya completó todos los eventos de hoy."""
        secuencia = SECUENCIA_SIMPLIFICADA if empleado.solo_entrada_salida else SECUENCIA_COMPLETA
        if ultimo_tipo is None:
            return secuencia[0]
        if ultimo_tipo not in secuencia:
            # Evento de un ciclo distinto al de hoy (ej. cambiaron la marca del
            # empleado a mitad del día): se reinicia desde el principio.
            return secuencia[0]
        idx = secuencia.index(ultimo_tipo)
        if idx + 1 < len(secuencia):
            return secuencia[idx + 1]
        return None

    def registrar_evento(
        self, empleado_id: int, tipo_evento: str, device_id: int | None = None
    ) -> EventoAsistencia:
        if tipo_evento not in TIPOS_EVENTO_ASISTENCIA:
            raise ValidationError(f"Tipo de evento inválido. Válidos: {TIPOS_EVENTO_ASISTENCIA}")
        empleado = self.emp_repo.get(empleado_id)
        if not empleado or not empleado.activo:
            raise NotFoundError("Empleado no encontrado o inactivo")

        self._cerrar_dias_pendientes(empleado_id)

        dt_inicio, dt_fin = _rango_dia_colombia(_hoy_colombia())
        ultimo = self.repo.get_ultimo_evento_en_rango(empleado_id, dt_inicio, dt_fin)
        self._validar_transicion(ultimo.tipo_evento if ultimo else None, tipo_evento)

        evento = self.repo.crear_evento(empleado_id, tipo_evento, device_id)
        self.db.commit()
        self.db.refresh(evento)
        return evento

    def registrar_evento_dispositivo(self, fingerprint_id: int, device_id: int | None) -> dict:
        """Usado por POST /device/event. El dispositivo solo manda quién puso el
        dedo; el evento (ENTRY, LUNCH_START, etc.) se calcula automáticamente según
        la secuencia del empleado. A diferencia del resto del backend, nunca lanza
        una excepción HTTP: el ESP32 siempre recibe 200 y revisa `success`."""
        empleado = self.emp_repo.get_by_fingerprint_id(fingerprint_id)
        if not empleado or not empleado.activo:
            return {"success": False, "employee_name": None, "message": "Huella no reconocida", "event_type": None}

        self._cerrar_dias_pendientes(empleado.id)

        dt_inicio, dt_fin = _rango_dia_colombia(_hoy_colombia())
        ultimo = self.repo.get_ultimo_evento_en_rango(empleado.id, dt_inicio, dt_fin)

        if ultimo is not None:
            transcurrido = datetime.now(timezone.utc) - _a_utc_aware(ultimo.timestamp)
            if transcurrido < TIEMPO_MINIMO_ENTRE_EVENTOS:
                horas = self._horas_por_empleado_semana_actual().get(empleado.id, 0.0)
                return {
                    "success": False,
                    "employee_name": empleado.nombre,
                    "message": "Ya se registró una marca hace unos momentos. Espera unos minutos.",
                    "event_type": None,
                    "horas_semana": horas,
                    "horas_objetivo": HORAS_OBJETIVO_SEMANAL,
                }

        siguiente = self._siguiente_evento(empleado, ultimo.tipo_evento if ultimo else None)

        if siguiente is None:
            horas = self._horas_por_empleado_semana_actual().get(empleado.id, 0.0)
            return {
                "success": False,
                "employee_name": empleado.nombre,
                "message": "Ya se registraron todos los eventos de hoy",
                "event_type": None,
                "horas_semana": horas,
                "horas_objetivo": HORAS_OBJETIVO_SEMANAL,
            }

        evento = self.repo.crear_evento(empleado.id, siguiente, device_id)
        self.db.commit()
        self.db.refresh(evento)
        horas = self._horas_por_empleado_semana_actual().get(empleado.id, 0.0)
        return {
            "success": True,
            "employee_name": empleado.nombre,
            "message": MENSAJE_EVENTO.get(siguiente, "Evento registrado"),
            "event_type": siguiente,
            "horas_semana": horas,
            "horas_objetivo": HORAS_OBJETIVO_SEMANAL,
        }

    def estado_hoy(self) -> list[dict]:
        self._cerrar_dias_pendientes()
        empleados = self.emp_repo.listar(limit=10000)
        empleados_activos = [e for e in empleados if e.activo]
        dt_inicio, dt_fin = _rango_dia_colombia(_hoy_colombia())
        eventos_hoy = self.repo.get_eventos_en_rango(dt_inicio, dt_fin)

        eventos_por_empleado: dict[int, list[EventoAsistencia]] = {}
        for ev in eventos_hoy:
            eventos_por_empleado.setdefault(ev.empleado_id, []).append(ev)

        resultado = []
        for emp in empleados_activos:
            eventos = eventos_por_empleado.get(emp.id, [])
            ultimo = eventos[-1] if eventos else None
            estado = ESTADO_POR_ULTIMO_EVENTO.get(ultimo.tipo_evento if ultimo else None, "ausente")

            entrada_tardia = False
            primer_entry = next((e for e in eventos if e.tipo_evento == "ENTRY"), None)
            if primer_entry is not None:
                hora_local = _a_utc_aware(primer_entry.timestamp).astimezone(COLOMBIA_TZ).time()
                entrada_tardia = hora_local > HORA_LIMITE_ENTRADA

            resultado.append(
                {
                    "empleado_id": emp.id,
                    "nombre": emp.nombre,
                    "cargo": emp.cargo,
                    "estado": estado,
                    "ultimo_evento": ultimo.tipo_evento if ultimo else None,
                    "ultima_hora": ultimo.timestamp if ultimo else None,
                    "hora_entrada": primer_entry.timestamp if primer_entry else None,
                    "entrada_tardia": entrada_tardia,
                }
            )
        return resultado

    def _horas_por_empleado_semana_actual(self) -> dict[int, float]:
        """Solo el total (sin desglose por día) — usada en la ruta rápida del
        dispositivo, en cada marcada de huella, para no cargarla con trabajo
        que ahí no hace falta."""
        dt_inicio, dt_fin, _, _ = _rango_semana(None)
        eventos = self.repo.get_eventos_en_rango(dt_inicio, dt_fin)
        eventos_por_empleado: dict[int, list[EventoAsistencia]] = {}
        for ev in eventos:
            eventos_por_empleado.setdefault(ev.empleado_id, []).append(ev)
        return {
            empleado_id: round(_horas_trabajadas(evs, dt_fin), 2)
            for empleado_id, evs in eventos_por_empleado.items()
        }

    def _resumen_semana_por_empleado(self, semana_inicio: date | None) -> tuple[dict[int, dict], date, date]:
        dt_inicio, dt_fin, lunes, domingo = _rango_semana(semana_inicio)
        eventos = self.repo.get_eventos_en_rango(dt_inicio, dt_fin)
        eventos_por_empleado: dict[int, list[EventoAsistencia]] = {}
        for ev in eventos:
            eventos_por_empleado.setdefault(ev.empleado_id, []).append(ev)

        hoy = _hoy_colombia()
        resumen = {
            empleado_id: _resumen_semana_empleado(evs, hoy) for empleado_id, evs in eventos_por_empleado.items()
        }
        return resumen, lunes, domingo

    def horas_semana_empleado(self, empleado_id: int, semana_inicio: date | None = None) -> dict:
        """Resumen semanal (horas totales, promedio diario, desayuno/almuerzo
        promedio) para un empleado, de una semana cualquiera (por defecto la
        actual, de lunes a hoy en hora Colombia)."""
        empleado = self.emp_repo.get(empleado_id)
        if not empleado:
            raise NotFoundError("Empleado no encontrado")
        self._cerrar_dias_pendientes(empleado_id)
        resumen_por_empleado, lunes, domingo = self._resumen_semana_por_empleado(semana_inicio)
        resumen = resumen_por_empleado.get(empleado_id, _resumen_semana_empleado([], _hoy_colombia()))
        return {
            "empleado_id": empleado.id,
            "empleado_nombre": empleado.nombre,
            "cargo": empleado.cargo,
            "horas_objetivo": HORAS_OBJETIVO_SEMANAL,
            "semana_inicio": lunes,
            "semana_fin": domingo,
            **resumen,
        }

    def horas_semana_todos(self, semana_inicio: date | None = None) -> list[dict]:
        """Resumen semanal de todos los empleados activos, para el reporte de
        RRHH en la aplicación web (tarjetas + tooltip por empleado)."""
        self._cerrar_dias_pendientes()
        empleados = [e for e in self.emp_repo.listar(limit=10000) if e.activo]
        resumen_por_empleado, lunes, domingo = self._resumen_semana_por_empleado(semana_inicio)
        resumen_vacio = _resumen_semana_empleado([], _hoy_colombia())
        return [
            {
                "empleado_id": e.id,
                "empleado_nombre": e.nombre,
                "cargo": e.cargo,
                "horas_objetivo": HORAS_OBJETIVO_SEMANAL,
                "semana_inicio": lunes,
                "semana_fin": domingo,
                **resumen_por_empleado.get(e.id, resumen_vacio),
            }
            for e in empleados
        ]

    def reporte(
        self,
        empleado_id: int | None = None,
        fecha_inicio: date | None = None,
        fecha_fin: date | None = None,
        tipo_evento: str | None = None,
        skip: int = 0,
        limit: int = 5000,
    ) -> list[dict]:
        self._cerrar_dias_pendientes(empleado_id)
        return self.repo.listar(empleado_id, fecha_inicio, fecha_fin, tipo_evento, skip, limit)

    def sync_dispositivo(self) -> list[dict]:
        empleados = self.emp_repo.listar_activos_con_fingerprint()
        return [{"fingerprint_id": e.fingerprint_id, "name": e.nombre} for e in empleados]
