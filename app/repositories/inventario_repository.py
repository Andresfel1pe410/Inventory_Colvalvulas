"""Repositorio de inventario."""
from sqlalchemy import func, select
from app.repositories.base_repository import BaseRepository
from app.models import Inventario, DetallePedido, Pedido


class InventarioRepository(BaseRepository[Inventario]):
    def __init__(self, db):
        super().__init__(Inventario, db)

    def get_by_producto(self, producto_id: int) -> Inventario | None:
        return (
            self.db.query(Inventario)
            .filter(Inventario.producto_id == producto_id)
            .first()
        )

    def get_all_con_requerido(
        self, skip: int = 0, limit: int = 100, pedido_ids: list[int] | None = None
    ) -> list[dict]:
        """Lista inventario con cantidad requerida por pedidos.
        Si pedido_ids es None: suma todos los pedidos en_espera y en_proceso.
        Si pedido_ids tiene valores: suma solo esos pedidos.
        """
        subq_base = (
            select(DetallePedido.producto_id, func.sum(DetallePedido.cantidad).label("requerido"))
            .join(Pedido, Pedido.id == DetallePedido.pedido_id)
        )
        if pedido_ids:
            subq_base = subq_base.where(Pedido.id.in_(pedido_ids))
        else:
            subq_base = subq_base.where(Pedido.estado.in_(("en_espera", "en_proceso")))
        subq = subq_base.group_by(DetallePedido.producto_id).subquery()

        rows = (
            self.db.query(
                Inventario,
                func.coalesce(subq.c.requerido, 0).label("cantidad_requerida"),
            )
            .outerjoin(subq, Inventario.producto_id == subq.c.producto_id)
            .offset(skip)
            .limit(limit)
            .all()
        )

        result = []
        for inv, cantidad_requerida in rows:
            req = int(cantidad_requerida) if cantidad_requerida else 0
            result.append({
                "id": inv.id,
                "producto_id": inv.producto_id,
                "stock_actual": inv.stock_actual,
                "stock_minimo": inv.stock_minimo,
                "ubicacion": inv.ubicacion,
                "created_at": inv.created_at,
                "updated_at": inv.updated_at,
                "cantidad_requerida": req,
                "stock_disponible": inv.stock_actual - req,
            })
        return result
