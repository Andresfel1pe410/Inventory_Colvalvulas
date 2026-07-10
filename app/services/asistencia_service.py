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

        dt_inicio, dt_fin = _rango_dia_colombia(_hoy_colombia())
        ultimo = self.repo.get_ultimo_evento_en_rango(empleado.id, dt_inicio, dt_fin)
        siguiente = self._siguiente_evento(empleado, ultimo.tipo_evento if ultimo else None)

        if siguiente is None:
            return {
                "success": False,
                "employee_name": empleado.nombre,
                "message": "Ya se registraron todos los eventos de hoy",
                "event_type": None,
            }

        evento = self.repo.crear_evento(empleado.id, siguiente, device_id)
        self.db.commit()
        self.db.refresh(evento)
        return {
            "success": True,
            "employee_name": empleado.nombre,
            "message": MENSAJE_EVENTO.get(siguiente, "Evento registrado"),
            "event_type": siguiente,
        }

    def estado_hoy(self) -> list[dict]:
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
                    "entrada_tardia": entrada_tardia,
                }
            )
        return resultado

    def reporte(
        self,
        empleado_id: int | None = None,
        fecha_inicio: date | None = None,
        fecha_fin: date | None = None,
        tipo_evento: str | None = None,
        skip: int = 0,
        limit: int = 5000,
    ) -> list[dict]:
        return self.repo.listar(empleado_id, fecha_inicio, fecha_fin, tipo_evento, skip, limit)

    def sync_dispositivo(self) -> list[dict]:
        empleados = self.emp_repo.listar_activos_con_fingerprint()
        return [{"fingerprint_id": e.fingerprint_id, "name": e.nombre} for e in empleados]
