"""
Schemas Pydantic para validación y serialización.
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


# ============= ROL =============
class RolBase(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class RolCreate(RolBase):
    pass


class Rol(RolBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============= USUARIO =============
class UsuarioBase(BaseModel):
    email: str
    nombre: str
    apellido: Optional[str] = None
    activo: bool = True


class UsuarioCreate(UsuarioBase):
    auth_user_id: str


class Usuario(UsuarioBase):
    id: int
    auth_user_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============= CLIENTE =============
ESTADOS_CLIENTE = ("enviar", "enviar_parcial", "no_enviar", "solo_contado")


class ClienteBase(BaseModel):
    razon_social: str
    tipo_documento: str  # NIT, CC
    numero_identificacion: str
    dv: Optional[str] = None
    regimen: Optional[str] = None
    pais: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    departamento: Optional[str] = None
    codigo_postal: Optional[str] = None
    email: Optional[str] = None
    responsabilidad_fiscal: Optional[str] = None
    detalles_tributarios: Optional[str] = None
    vendedor: Optional[str] = None
    estado_cliente: str = Field(default="enviar", pattern="^(enviar|enviar_parcial|no_enviar|solo_contado)$")


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    razon_social: Optional[str] = None
    tipo_documento: Optional[str] = None
    numero_identificacion: Optional[str] = None
    dv: Optional[str] = None
    regimen: Optional[str] = None
    pais: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    departamento: Optional[str] = None
    codigo_postal: Optional[str] = None
    email: Optional[str] = None
    responsabilidad_fiscal: Optional[str] = None
    detalles_tributarios: Optional[str] = None
    vendedor: Optional[str] = None
    estado_cliente: Optional[str] = Field(
        None, pattern="^(enviar|enviar_parcial|no_enviar|solo_contado)$"
    )


class Cliente(ClienteBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============= PRODUCTO =============
LISTAS_PRECIOS = ("lista_1", "lista_2", "lista_3", "lista_plus", "lista_plus_costa")


class ProductoListaPrecioBase(BaseModel):
    lista: str = Field(..., pattern="^(lista_1|lista_2|lista_3|lista_plus|lista_plus_costa)$")
    codigo: str
    precio: Decimal = Field(ge=0)


class ProductoListaPrecio(ProductoListaPrecioBase):
    id: int
    producto_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProductoBase(BaseModel):
    referencia: str
    material: str
    listas_precio: list[ProductoListaPrecioBase] = Field(..., min_length=1)


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    referencia: Optional[str] = None
    material: Optional[str] = None
    listas_precio: Optional[list[ProductoListaPrecioBase]] = None


class Producto(ProductoBase):
    id: int
    listas_precio: list[ProductoListaPrecio] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============= INVENTARIO =============
class InventarioBase(BaseModel):
    producto_id: int
    stock_actual: int = Field(default=0, ge=0)
    stock_minimo: int = 0
    ubicacion: Optional[str] = None


class InventarioCreate(InventarioBase):
    pass


class InventarioUpdate(BaseModel):
    stock_actual: Optional[int] = Field(None, ge=0)
    stock_minimo: Optional[int] = Field(None, ge=0)
    ubicacion: Optional[str] = None


class Inventario(InventarioBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InventarioResumen(Inventario):
    """Inventario con cantidad requerida por pedidos y stock disponible."""
    cantidad_requerida: int = 0
    stock_disponible: int = 0


class InventarioResumenConProducto(InventarioResumen):
    """Inventario resumen con producto embebido (evita petición separada de productos)."""
    producto: Optional[Producto] = None

    model_config = ConfigDict(from_attributes=True)


# ============= MOVIMIENTO INVENTARIO =============
class MovimientoInventarioBase(BaseModel):
    producto_id: int
    tipo: str = Field(..., pattern="^(entrada|salida|ajuste)$")
    cantidad: int = Field(description="Cantidad (puede ser negativa en entradas para correcciones)")

    @field_validator("cantidad")
    @classmethod
    def cantidad_no_cero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("La cantidad no puede ser cero")
        return v
    motivo: Optional[str] = None
    referencia_tipo: Optional[str] = None
    referencia_id: Optional[int] = None


class MovimientoInventarioCreate(MovimientoInventarioBase):
    pass


class MovimientoInventario(MovimientoInventarioBase):
    id: int
    stock_anterior: int
    stock_nuevo: int
    usuario_id: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MovimientoInventarioReporte(BaseModel):
    """Entradas unificadas por producto (suma de cantidades)."""
    producto_id: int
    producto_referencia: str = ""
    producto_material: str = ""
    cantidad_total: int

    model_config = ConfigDict(from_attributes=True)


class MovimientoEntradaDetalle(BaseModel):
    """Movimiento de entrada individual (no agregado)."""
    id: int
    producto_id: int
    producto_referencia: str = ""
    producto_material: str = ""
    cantidad: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MovimientoInventarioReporteDetalle(BaseModel):
    """Movimiento unificado de inventario con contexto de pedido/remisión."""
    id: int
    producto_id: int
    producto_referencia: str = ""
    producto_material: str = ""
    tipo: str
    cantidad: int
    stock_anterior: int
    stock_nuevo: int
    referencia_tipo: Optional[str] = None
    referencia_id: Optional[int] = None
    pedido_id: Optional[int] = None
    numero_pedido: Optional[str] = None
    cliente_razon_social: Optional[str] = None
    numero_remision: Optional[str] = None
    motivo: Optional[str] = None
    usuario_nombre: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CorregirMovimientoRequest(BaseModel):
    """Datos para corregir un movimiento de entrada."""
    nuevo_producto_id: int = Field(gt=0)
    nueva_cantidad: int = Field(ge=0, description="Cantidad no negativa")


# ============= PEDIDO =============
class DetallePedidoBase(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)
    precio_unitario: Decimal | None = Field(None, ge=0)  # Si no se envía, usa precio del producto


class DetallePedidoCreate(DetallePedidoBase):
    pass


class DetallePedido(DetallePedidoBase):
    id: int
    pedido_id: int
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class PedidoBase(BaseModel):
    cliente_id: int
    observaciones: Optional[str] = None


class PedidoCreate(PedidoBase):
    detalles: list[DetallePedidoCreate]
    lista_precios: str = "lista_1"  # lista_1, lista_2, lista_3, lista_plus, lista_plus_costa
    descuento: Decimal = Field(default=0, ge=0, le=100)  # Porcentaje 0-100
    vendedor_id: Optional[int] = None


class PedidoUpdate(BaseModel):
    estado: Optional[str] = Field(None, pattern="^(en_espera|en_proceso|enviado|cancelado)$")
    observaciones: Optional[str] = None


class PedidoUpdateFull(BaseModel):
    """Actualización completa: cliente, lista, descuento, observaciones y detalles."""
    cliente_id: int
    observaciones: Optional[str] = None
    lista_precios: str = "lista_1"  # lista_1, lista_2, lista_3, lista_plus, lista_plus_costa
    descuento: Decimal = Field(default=0, ge=0, le=100)
    vendedor_id: Optional[int] = None
    detalles: list[DetallePedidoCreate]


class DetalleEnvioCreate(BaseModel):
    """Cantidad enviada por producto (0 = no enviado)."""
    producto_id: int
    cantidad_enviada: int = Field(ge=0)


class PedidoEnvioCreate(BaseModel):
    transportadora: str  # YP, A.N., E.Express, Interrapidisimo
    numero_factura: Optional[str] = None
    numero_guia: Optional[str] = None
    detalles: Optional[list[DetalleEnvioCreate]] = None  # Checklist: cantidad por producto
    resumen_envio: Optional[str] = None  # Anotación del checklist


class PedidoIntencionUpdate(BaseModel):
    """Actualización de intención de envío."""
    intencion_envio: Optional[str] = Field(
        None,
        pattern="^(enviar|enviar_parcial|no_enviar|solo_contado)$",
    )


class PedidoImpresoUpdate(BaseModel):
    """Marca si el pedido ya fue impreso."""
    impreso: bool


class Pedido(PedidoBase):
    id: int
    numero_pedido: str
    usuario_id: int
    estado: str
    subtotal: Decimal
    total: Decimal
    fecha_envio: Optional[datetime] = None
    usuario_envio_id: Optional[int] = None
    transportadora: Optional[str] = None
    numero_factura: Optional[str] = None
    numero_guia: Optional[str] = None
    resumen_envio: Optional[str] = None
    intencion_envio: Optional[str] = None  # enviar, enviar_parcial, no_enviar, solo_contado
    lista_precios: Optional[str] = None
    descuento: Decimal = 0
    impreso: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UsuarioEnvioInfo(BaseModel):
    id: int
    nombre: str
    apellido: Optional[str] = None
    email: str

    model_config = ConfigDict(from_attributes=True)


class PedidoConDetalles(Pedido):
    detalles: list[DetallePedido] = []
    usuario_envio: Optional[UsuarioEnvioInfo] = None
    usuario: Optional[UsuarioEnvioInfo] = None


# ============= REMISION =============
class Remision(BaseModel):
    id: int
    numero_remision: str
    pedido_id: Optional[int] = None
    cliente_id: int
    estado: str
    fecha_emision: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    # Datos del pedido asociado (cuando existe)
    numero_pedido: Optional[str] = None
    numero_factura: Optional[str] = None
    numero_guia: Optional[str] = None
    transportadora: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ============= INVENTARIO PROCESO =============
class InventarioProcesoBase(BaseModel):
    referencia: str
    material: str
    cantidad: int = Field(default=0, ge=0)


class InventarioProceso(InventarioProcesoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MovimientoInventarioProcesoBase(BaseModel):
    tipo: str = Field(..., pattern="^(entrada|salida)$")
    cantidad: int = Field(gt=0)
    usuario_realizo: str


class MovimientoInventarioProcesoCreate(MovimientoInventarioProcesoBase):
    referencia: str
    material: str


class MovimientoInventarioProceso(MovimientoInventarioProcesoBase):
    id: int
    inventario_proceso_id: int
    referencia: str
    material: str
    registrada_por: str
    cantidad_anterior: int
    cantidad_nueva: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============= PROCESO: PLANEACIÓN =============
ESTADOS_TAREA = ("pendiente", "en_progreso", "hecha")


class DependenciaBase(BaseModel):
    nombre: str


class DependenciaCreate(DependenciaBase):
    empleado_ids: list[int] = Field(default_factory=list)


class Dependencia(DependenciaBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DependenciaListItem(Dependencia):
    """Fila para la lista/tarjetas de dependencias, sin traer el detalle completo."""
    empleados_count: int


class DependenciaEmpleadoAdd(BaseModel):
    empleado_id: int


class TareaCreate(BaseModel):
    empleado_id: int
    descripcion: str
    cantidad: int = Field(..., ge=1)


class TareaUpdate(BaseModel):
    estado: str = Field(..., pattern="^(pendiente|en_progreso|hecha)$")
    realizado: Optional[int] = Field(None, ge=0)


class Tarea(BaseModel):
    id: int
    dependencia_id: int
    empleado_id: int
    descripcion: str
    cantidad: int
    realizado: int
    estado: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TareaEnDependencia(BaseModel):
    """Forma anidada de solo lectura para el detalle de una dependencia."""
    id: int
    descripcion: str
    cantidad: int
    realizado: int
    estado: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmpleadoConTareas(BaseModel):
    empleado_id: int
    nombre: str
    cargo: Optional[str] = None
    tareas: list[TareaEnDependencia]


class DependenciaDetalle(BaseModel):
    id: int
    nombre: str
    created_at: datetime
    updated_at: datetime
    empleados: list[EmpleadoConTareas]


class TareaConDependencia(Tarea):
    """Tarea vista desde 'mis tareas': incluye el nombre de la dependencia
    porque el empleado no navega por dependencia, ve todas sus tareas juntas."""
    dependencia_nombre: str


# ============= RRHH: EMPLEADOS =============
TIPOS_EVENTO_ASISTENCIA = (
    "ENTRY",
    "BREAKFAST_START",
    "BREAKFAST_END",
    "LUNCH_START",
    "LUNCH_END",
    "EXIT",
)
_PATTERN_TIPO_EVENTO = "^(ENTRY|BREAKFAST_START|BREAKFAST_END|LUNCH_START|LUNCH_END|EXIT)$"


class EmpleadoBase(BaseModel):
    nombre: str
    documento: str
    cargo: Optional[str] = None
    telefono: Optional[str] = None
    activo: bool = True
    fingerprint_id: Optional[int] = None
    solo_entrada_salida: bool = False


class EmpleadoCreate(EmpleadoBase):
    pass


class EmpleadoUpdate(BaseModel):
    nombre: Optional[str] = None
    documento: Optional[str] = None
    cargo: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None
    fingerprint_id: Optional[int] = None
    solo_entrada_salida: Optional[bool] = None


class Empleado(EmpleadoBase):
    id: int
    fecha_creacion: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmpleadoAccesoCreate(BaseModel):
    """Datos para crear el acceso de login (Supabase Auth) de un empleado ya existente."""
    email: str
    password: str = Field(min_length=6)


class EmpleadoAccesoEstado(BaseModel):
    tiene_acceso: bool
    email: Optional[str] = None


# ============= RRHH: ASISTENCIA =============
class EventoAsistenciaCreate(BaseModel):
    empleado_id: int
    tipo_evento: str = Field(..., pattern=_PATTERN_TIPO_EVENTO)
    device_id: Optional[int] = None


class EventoAsistencia(BaseModel):
    id: int
    empleado_id: int
    tipo_evento: str
    timestamp: datetime
    device_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class EventoAsistenciaReporte(BaseModel):
    """Fila de reporte, con datos del empleado ya unidos (evita otra consulta en frontend)."""
    id: int
    empleado_id: int
    empleado_nombre: str
    cargo: Optional[str] = None
    tipo_evento: str
    timestamp: datetime
    device_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class EmpleadoEstadoHoy(BaseModel):
    """Estado derivado de un empleado para el día actual (dashboard)."""
    empleado_id: int
    nombre: str
    cargo: Optional[str] = None
    estado: str  # presente | ausente | en_desayuno | en_almuerzo | salida
    ultimo_evento: Optional[str] = None
    ultima_hora: Optional[datetime] = None
    hora_entrada: Optional[datetime] = None
    entrada_tardia: bool = False

    model_config = ConfigDict(from_attributes=True)


class HorasSemanaEmpleado(BaseModel):
    """Resumen semanal de un empleado (horas totales contra la jornada legal
    de 42h, más promedios diarios) para una semana cualquiera — la actual
    (de lunes a hoy) o una semana pasada ya cerrada. Usado por el reporte de
    RRHH en la web (tarjetas + tooltip por empleado)."""
    empleado_id: int
    empleado_nombre: str
    cargo: Optional[str] = None
    horas_trabajadas: float
    horas_objetivo: float
    semana_inicio: date
    semana_fin: date
    dias_trabajados: int
    promedio_horas_dia: float
    promedio_desayuno_min: float
    promedio_almuerzo_min: float


# ============= RRHH: CONTRATO DISPOSITIVO (ESP32) =============
# Nombres de campo en inglés a propósito: son el contrato fijo que hablará con el
# firmware del ESP32, no se traducen aunque el resto del proyecto use español.
# El dispositivo ya no manda "event": el backend calcula automáticamente cuál es
# el siguiente evento del empleado (ver AsistenciaService._siguiente_evento).
class DeviceEventRequest(BaseModel):
    device_id: int
    fingerprint_id: int


class DeviceEventResponse(BaseModel):
    success: bool
    employee_name: Optional[str] = None
    message: str
    event_type: Optional[str] = None
    # Horas trabajadas de lunes a hoy vs. la jornada legal semanal (42h en
    # Colombia), para que la pantalla del ESP32 muestre "llevas X/42 horas".
    horas_semana: Optional[float] = None
    horas_objetivo: Optional[float] = None


class DeviceEmployeeSync(BaseModel):
    fingerprint_id: int
    name: str
