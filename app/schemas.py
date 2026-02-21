"""
Schemas Pydantic para validación y serialización.
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


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
class ClienteBase(BaseModel):
    nit: str
    razon_social: str
    nombre_gerente: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    vendedor: Optional[str] = None
    email: Optional[str] = None


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nit: Optional[str] = None
    razon_social: Optional[str] = None
    nombre_gerente: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    departamento: Optional[str] = None
    vendedor: Optional[str] = None
    email: Optional[str] = None


class Cliente(ClienteBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============= PRODUCTO =============
LISTAS_PRECIOS = ("lista_1", "lista_2", "lista_3", "lista_plus")


class ProductoBase(BaseModel):
    codigo: str
    referencia: str
    material: str
    precio: Decimal = Field(ge=0)
    lista: str = Field(..., pattern="^(lista_1|lista_2|lista_3|lista_plus)$")


class ProductoCreate(ProductoBase):
    pass


class ProductoUpdate(BaseModel):
    codigo: Optional[str] = None
    referencia: Optional[str] = None
    material: Optional[str] = None
    precio: Optional[Decimal] = Field(None, ge=0)
    lista: Optional[str] = Field(None, pattern="^(lista_1|lista_2|lista_3|lista_plus)$")


class Producto(ProductoBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ============= INVENTARIO =============
class InventarioBase(BaseModel):
    producto_id: int
    stock_actual: int = 0  # Puede ser negativo = faltante para pedidos
    stock_minimo: int = 0
    ubicacion: Optional[str] = None


class InventarioCreate(InventarioBase):
    pass


class InventarioUpdate(BaseModel):
    stock_actual: Optional[int] = None  # Permite negativo
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


# ============= MOVIMIENTO INVENTARIO =============
class MovimientoInventarioBase(BaseModel):
    producto_id: int
    tipo: str = Field(..., pattern="^(entrada|salida|ajuste)$")
    cantidad: int = Field(gt=0)
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
    lista_precios: str = "lista_1"  # lista_1, lista_2, lista_3, lista_plus
    descuento: Decimal = Field(default=0, ge=0, le=100)  # Porcentaje 0-100


class PedidoUpdate(BaseModel):
    estado: Optional[str] = Field(None, pattern="^(en_espera|en_proceso|enviado|cancelado)$")
    observaciones: Optional[str] = None


class PedidoUpdateFull(BaseModel):
    """Actualización completa: cliente, lista, descuento, observaciones y detalles."""
    cliente_id: int
    observaciones: Optional[str] = None
    lista_precios: str = "lista_1"
    descuento: Decimal = Field(default=0, ge=0, le=100)
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
    lista_precios: Optional[str] = None
    descuento: Decimal = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UsuarioEnvioInfo(BaseModel):
    id: int
    nombre: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class PedidoConDetalles(Pedido):
    detalles: list[DetallePedido] = []
    usuario_envio: Optional[UsuarioEnvioInfo] = None


# ============= ORDEN EMPAQUE =============
class DetalleEmpaqueBase(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)


class DetalleEmpaqueCreate(DetalleEmpaqueBase):
    pass


class DetalleEmpaque(DetalleEmpaqueBase):
    id: int
    orden_empaque_id: int
    cantidad_empacada: int = 0

    model_config = ConfigDict(from_attributes=True)


class OrdenEmpaqueBase(BaseModel):
    pedido_id: int


class OrdenEmpaqueCreate(OrdenEmpaqueBase):
    detalles: list[DetalleEmpaqueCreate]


class OrdenEmpaqueUpdate(BaseModel):
    estado: Optional[str] = Field(None, pattern="^(pendiente|en_proceso|cerrada|cancelada)$")


class OrdenEmpaque(OrdenEmpaqueBase):
    id: int
    numero_orden: str
    estado: str
    usuario_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrdenEmpaqueConDetalles(OrdenEmpaque):
    detalles: list[DetalleEmpaque] = []


# ============= REMISION =============
class DetalleRemisionCreate(BaseModel):
    producto_id: int
    cantidad: int = Field(gt=0)


class RemisionCreate(BaseModel):
    orden_empaque_id: int
    cliente_id: int
    detalles: list[DetalleRemisionCreate]


class Remision(BaseModel):
    id: int
    numero_remision: str
    pedido_id: Optional[int] = None
    orden_empaque_id: Optional[int] = None
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
