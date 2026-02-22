"""Repositorio de pedidos."""
from sqlalchemy import case, func
from sqlalchemy.orm import joinedload
from app.repositories.base_repository import BaseRepository
from app.models import Pedido, DetallePedido

# Orden: en_proceso (1) -> en_espera (2) -> enviado (3) -> cancelado (4)
ORDEN_ESTADO = case(
    (Pedido.estado == "en_proceso", 1),
    (Pedido.estado == "en_espera", 2),
    (Pedido.estado == "enviado", 3),
    (Pedido.estado == "cancelado", 4),
    else_=5,
)


class PedidoRepository(BaseRepository[Pedido]):
    def __init__(self, db):
        super().__init__(Pedido, db)

    def get_all(self, skip: int = 0, limit: int = 100):
        """Lista pedidos ordenados: en_proceso, en_espera, enviado, cancelado."""
        return (
            self.db.query(Pedido)
            .order_by(ORDEN_ESTADO, Pedido.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_with_detalles(self, pedido_id: int) -> Pedido | None:
        return (
            self.db.query(Pedido)
            .options(joinedload(Pedido.detalles), joinedload(Pedido.cliente), joinedload(Pedido.usuario_envio))
            .filter(Pedido.id == pedido_id)
            .first()
        )

    def get_by_estados(self, estados: list[str], skip: int = 0, limit: int = 500) -> list[Pedido]:
        """Lista pedidos filtrados por estados, ordenados igual que get_all."""
        return (
            self.db.query(Pedido)
            .filter(Pedido.estado.in_(estados))
            .order_by(ORDEN_ESTADO, Pedido.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_all_for_usuario(self, usuario_id: int, skip: int = 0, limit: int = 100):
        """Lista solo pedidos creados por el usuario."""
        return (
            self.db.query(Pedido)
            .filter(Pedido.usuario_id == usuario_id)
            .order_by(ORDEN_ESTADO, Pedido.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_estados_for_usuario(
        self, usuario_id: int, estados: list[str], skip: int = 0, limit: int = 500
    ) -> list[Pedido]:
        """Lista pedidos del usuario filtrados por estados."""
        return (
            self.db.query(Pedido)
            .filter(Pedido.usuario_id == usuario_id, Pedido.estado.in_(estados))
            .order_by(ORDEN_ESTADO, Pedido.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    def generar_numero(self) -> str:
        max_id = self.db.query(func.max(Pedido.id)).scalar() or 0
        return f"PED-{max_id + 1:06d}"
