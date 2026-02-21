"""
Modelos SQLAlchemy ORM - Mapeo de tablas PostgreSQL.
"""
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID
from sqlalchemy import (
    Column, BigInteger, String, Text, Boolean, Integer, 
    Numeric, DateTime, Date, ForeignKey, CheckConstraint
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class Rol(Base):
    __tablename__ = "rol"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    nombre = Column(String(50), unique=True, nullable=False)
    descripcion = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Usuario(Base):
    __tablename__ = "usuario"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    auth_user_id = Column(String(36), unique=True, nullable=False)  # UUID como string
    email = Column(String(255), nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100))
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    roles = relationship("UsuarioRol", back_populates="usuario", cascade="all, delete-orphan")


class UsuarioRol(Base):
    __tablename__ = "usuario_rol"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    usuario_id = Column(BigInteger, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    rol_id = Column(BigInteger, ForeignKey("rol.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    usuario = relationship("Usuario", back_populates="roles")
    rol = relationship("Rol")


class Cliente(Base):
    __tablename__ = "cliente"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    razon_social = Column(String(200), nullable=False)
    tipo_documento = Column(String(10), nullable=False)  # NIT, CC
    numero_identificacion = Column(String(30), nullable=False)
    dv = Column(String(5))
    regimen = Column(String(100))
    pais = Column(String(100))
    ciudad = Column(String(100))
    direccion = Column(String(255))
    telefono = Column(String(50))
    departamento = Column(String(100))
    codigo_postal = Column(String(20))
    email = Column(String(255))
    responsabilidad_fiscal = Column(String(100))
    detalles_tributarios = Column(Text)
    vendedor = Column(String(10))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class Producto(Base):
    __tablename__ = "producto"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    codigo = Column(String(50), unique=True, nullable=False)
    referencia = Column(String(200), nullable=False)
    material = Column(String(255), nullable=False)
    precio = Column(Numeric(15, 2), nullable=False)
    lista = Column(String(20), nullable=False)  # lista_1, lista_2, lista_3, lista_plus
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    inventario = relationship("Inventario", back_populates="producto", uselist=False, cascade="all, delete-orphan")


class Inventario(Base):
    __tablename__ = "inventario"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    producto_id = Column(BigInteger, ForeignKey("producto.id", ondelete="CASCADE"), nullable=False, unique=True)
    stock_actual = Column(Integer, default=0, nullable=False)
    stock_minimo = Column(Integer, default=0)
    ubicacion = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    producto = relationship("Producto", back_populates="inventario")


class MovimientoInventario(Base):
    __tablename__ = "movimiento_inventario"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    producto_id = Column(BigInteger, ForeignKey("producto.id", ondelete="CASCADE"), nullable=False)
    tipo = Column(String(20), nullable=False)  # entrada, salida, ajuste
    cantidad = Column(Integer, nullable=False)
    stock_anterior = Column(Integer, nullable=False)
    stock_nuevo = Column(Integer, nullable=False)
    motivo = Column(String(255))
    referencia_tipo = Column(String(50))
    referencia_id = Column(BigInteger)
    usuario_id = Column(BigInteger, ForeignKey("usuario.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)


class Pedido(Base):
    __tablename__ = "pedido"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    numero_pedido = Column(String(50), unique=True, nullable=False)
    cliente_id = Column(BigInteger, ForeignKey("cliente.id", ondelete="CASCADE"), nullable=False)
    usuario_id = Column(BigInteger, ForeignKey("usuario.id", ondelete="CASCADE"), nullable=False)
    estado = Column(String(20), default="en_espera", nullable=False)  # en_espera, en_proceso, enviado, cancelado
    subtotal = Column(Numeric(15, 2), default=0)
    total = Column(Numeric(15, 2), default=0)
    observaciones = Column(Text)
    fecha_envio = Column(DateTime(timezone=True))
    usuario_envio_id = Column(BigInteger, ForeignKey("usuario.id", ondelete="SET NULL"))
    transportadora = Column(String(50))  # YP, A.N., E.Express, Interrapidisimo
    numero_factura = Column(String(100))
    numero_guia = Column(String(100))
    resumen_envio = Column(Text)  # Anotación del checklist al marcar enviado
    lista_precios = Column(String(20), default="lista_1")  # lista_1, lista_2, lista_3, lista_plus
    descuento = Column(Numeric(5, 2), default=0)  # Porcentaje 0-100
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    detalles = relationship("DetallePedido", back_populates="pedido", cascade="all, delete-orphan")
    cliente = relationship("Cliente")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    usuario_envio = relationship("Usuario", foreign_keys=[usuario_envio_id])


class DetallePedido(Base):
    __tablename__ = "detalle_pedido"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pedido_id = Column(BigInteger, ForeignKey("pedido.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(BigInteger, ForeignKey("producto.id", ondelete="CASCADE"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(15, 2), nullable=False)
    subtotal = Column(Numeric(15, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    pedido = relationship("Pedido", back_populates="detalles")
    producto = relationship("Producto")


class OrdenEmpaque(Base):
    __tablename__ = "orden_empaque"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    pedido_id = Column(BigInteger, ForeignKey("pedido.id", ondelete="CASCADE"), nullable=False)
    numero_orden = Column(String(50), unique=True, nullable=False)
    estado = Column(String(20), default="pendiente", nullable=False)
    usuario_id = Column(BigInteger, ForeignKey("usuario.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    detalles = relationship("DetalleEmpaque", back_populates="orden_empaque", cascade="all, delete-orphan")
    pedido = relationship("Pedido")


class DetalleEmpaque(Base):
    __tablename__ = "detalle_empaque"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    orden_empaque_id = Column(BigInteger, ForeignKey("orden_empaque.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(BigInteger, ForeignKey("producto.id", ondelete="CASCADE"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    cantidad_empacada = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    orden_empaque = relationship("OrdenEmpaque", back_populates="detalles")
    producto = relationship("Producto")


class Remision(Base):
    __tablename__ = "remision"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    numero_remision = Column(String(50), unique=True, nullable=False)
    pedido_id = Column(BigInteger, ForeignKey("pedido.id", ondelete="SET NULL"))
    orden_empaque_id = Column(BigInteger, ForeignKey("orden_empaque.id", ondelete="SET NULL"))
    cliente_id = Column(BigInteger, ForeignKey("cliente.id", ondelete="CASCADE"), nullable=False)
    estado = Column(String(20), default="borrador", nullable=False)
    fecha_emision = Column(Date)
    fecha_entrega = Column(Date)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    pedido = relationship("Pedido", backref="remisiones")


class DetalleRemision(Base):
    __tablename__ = "detalle_remision"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    remision_id = Column(BigInteger, ForeignKey("remision.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(BigInteger, ForeignKey("producto.id", ondelete="CASCADE"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
