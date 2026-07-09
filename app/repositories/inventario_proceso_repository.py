"""Repositorio de Inventario de Proceso."""
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.core.exceptions import ValidationError
from app.models import InventarioProceso, MovimientoInventarioProceso


class InventarioProcesoRepository:
    """Repositorio para manejar inventario de proceso."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_all(self, skip: int = 0, limit: int = 100):
        """Obtiene todos los registros de inventario de proceso."""
        return (
            self.db.query(InventarioProceso)
            .order_by(desc(InventarioProceso.updated_at))
            .offset(skip)
            .limit(limit)
            .all()
        )
    
    def get_by_referencia_material(self, referencia: str, material: str) -> InventarioProceso | None:
        """Obtiene inventario de proceso por referencia y material."""
        return (
            self.db.query(InventarioProceso)
            .filter_by(referencia=referencia, material=material)
            .first()
        )
    
    def get_or_create(self, referencia: str, material: str) -> InventarioProceso:
        """Obtiene o crea un registro de inventario de proceso."""
        inv = self.get_by_referencia_material(referencia, material)
        if not inv:
            inv = InventarioProceso(referencia=referencia, material=material, cantidad=0)
            self.db.add(inv)
            self.db.flush()
        return inv
    
    def registrar_movimiento(
        self,
        inventario_proceso_id: int,
        tipo: str,  # 'entrada' o 'salida'
        cantidad: int,
        usuario_realizo: str,
        registrada_por: str,
    ) -> MovimientoInventarioProceso:
        """Registra un movimiento de entrada o salida."""
        inv = self.db.query(InventarioProceso).filter_by(id=inventario_proceso_id).one()
        
        cantidad_anterior = inv.cantidad
        
        if tipo == "entrada":
            cantidad_nueva = cantidad_anterior + cantidad
        else: # salida
            cantidad_nueva = cantidad_anterior - cantidad
        if cantidad_nueva < 0:
            raise ValidationError("La cantidad actual no puede quedar en negativo")
        
        inv.cantidad = cantidad_nueva
        self.db.flush()
        
        movimiento = MovimientoInventarioProceso(
            inventario_proceso_id=inventario_proceso_id,
            tipo=tipo,
            cantidad=cantidad,
            usuario_realizo=usuario_realizo,
            registrada_por=registrada_por,
            cantidad_anterior=cantidad_anterior,
            cantidad_nueva=cantidad_nueva,
        )
        self.db.add(movimiento)
        self.db.flush()
        
        return movimiento
    
    def get_movimientos(self, inventario_proceso_id: int | None = None, skip: int = 0, limit: int = 100):
        """Obtiene movimientos de inventario de proceso, con el ítem asociado precargado
        (referencia/material se leen de ahí vía las propiedades del modelo)."""
        query = self.db.query(MovimientoInventarioProceso).options(
            joinedload(MovimientoInventarioProceso.inventario_proceso)
        )

        if inventario_proceso_id is not None:
            query = query.filter(MovimientoInventarioProceso.inventario_proceso_id == inventario_proceso_id)

        return query.order_by(desc(MovimientoInventarioProceso.created_at)).offset(skip).limit(limit).all()
