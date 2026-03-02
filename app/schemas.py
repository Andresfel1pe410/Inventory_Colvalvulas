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


class CorregirMovimientoRequest(BaseModel):
    """Datos para corregir un movimiento de entrada."""
    nuevo_producto_id: int = Field(gt=0)
    nueva_cantidad: int = Field(description="Cantidad (puede ser negativa)")


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


class PedidoUpdate(BaseModel):
    estado: Optional[str] = Field(None, pattern="^(en_espera|en_proceso|enviado|cancelado)$")
    observaciones: Optional[str] = None


class PedidoUpdateFull(BaseModel):
    """Actualización completa: cliente, lista, descuento, observaciones y detalles."""
    cliente_id: int
    observaciones: Optional[str] = None
    lista_precios: str = "lista_1"  # lista_1, lista_2, lista_3, lista_plus, lista_plus_costa
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


class PedidoIntencionUpdate(BaseModel):
    """Actualización de intención de envío."""
    intencion_envio: Optional[str] = Field(
        None,
        pattern="^(enviar|enviar_parcial|no_enviar)$",
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
    intencion_envio: Optional[str] = None  # enviar, enviar_parcial, no_enviar
    lista_precios: Optional[str] = None
    descuento: Decimal = 0
    impreso: bool = False
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
