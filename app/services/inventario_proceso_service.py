"""
Servicio de inventario de proceso.
"""
from app.core.exceptions import ValidationError
from app.repositories.inventario_proceso_repository import InventarioProcesoRepository


class InventarioProcesoService:
    def __init__(self, db):
        self.db = db
        self.repo = InventarioProcesoRepository(db)
    
    def registrar_movimiento(
        self,
        referencia: str,
        material: str,
        tipo: str,
        cantidad: int,
        usuario_realizo: str,
        registrada_por: str,
        commit: bool = True,
    ):
        """Registra un movimiento de entrada o salida en inventario de proceso."""
        if not referencia or not referencia.strip():
            raise ValidationError("La referencia es obligatoria")
        if not material or not material.strip():
            raise ValidationError("El material es obligatorio")
        if tipo not in ("entrada", "salida"):
            raise ValidationError("Tipo de movimiento inválido. Use 'entrada' o 'salida'")
        if cantidad <= 0:
            raise ValidationError("La cantidad debe ser mayor a cero")
        if not usuario_realizo or not usuario_realizo.strip():
            raise ValidationError("Debe especificar quién realiza el movimiento")
        
        # Obtener o crear el item de inventario de proceso
        inv_proceso = self.repo.get_or_create(referencia.strip(), material.strip())

        cantidad_actual = inv_proceso.cantidad
        cantidad_nueva = cantidad_actual + cantidad if tipo == "entrada" else cantidad_actual - cantidad
        if cantidad_nueva < 0:
            raise ValidationError("La cantidad actual no puede quedar en negativo")
        if not registrada_por or not registrada_por.strip():
            raise ValidationError("Debe especificarse el usuario que registra el movimiento")
        
        movimiento = self.repo.registrar_movimiento(
            inventario_proceso_id=inv_proceso.id,
            tipo=tipo,
            cantidad=cantidad,
            usuario_realizo=usuario_realizo.strip(),
            registrada_por=registrada_por.strip(),
        )
        
        if commit:
            self.db.commit()
            self.db.refresh(movimiento)
        
        return movimiento
