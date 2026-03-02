"""Repositorio de movimientos de inventario."""
from datetime import datetime, date
from sqlalchemy import and_, func

from app.models import MovimientoInventario, Producto


class MovimientoInventarioRepository:
    def __init__(self, db):
        self.db = db

    def get_entradas_por_fecha(
        self,
        fecha_inicio: date,
        fecha_fin: date,
        skip: int = 0,
        limit: int = 5000,
    ) -> list[dict]:
        """Lista entradas unificadas por producto: suma de cantidades en el rango de fechas."""
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())

        subq = (
            self.db.query(
                MovimientoInventario.producto_id,
                func.sum(MovimientoInventario.cantidad).label("cantidad_total"),
            )
            .filter(
                MovimientoInventario.tipo == "entrada",
                and_(
                    MovimientoInventario.created_at >= dt_inicio,
                    MovimientoInventario.created_at <= dt_fin,
                ),
            )
            .group_by(MovimientoInventario.producto_id)
            .subquery()
        )

        rows = (
            self.db.query(
                subq.c.producto_id,
                subq.c.cantidad_total,
                Producto.referencia,
                Producto.material,
            )
            .join(Producto, Producto.id == subq.c.producto_id)
            .order_by(subq.c.cantidad_total.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        result = []
        for producto_id, cantidad_total, ref, mat in rows:
            result.append({
                "producto_id": producto_id,
                "producto_referencia": ref or "",
                "producto_material": mat or "",
                "cantidad_total": int(cantidad_total),
            })
        return result

    def get_entradas_detalle(
        self,
        fecha_inicio: date,
        fecha_fin: date,
        skip: int = 0,
        limit: int = 5000,
    ) -> list[dict]:
        """Lista movimientos de entrada individuales (no agregados) en el rango de fechas."""
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())

        rows = (
            self.db.query(MovimientoInventario, Producto.referencia, Producto.material)
            .join(Producto, Producto.id == MovimientoInventario.producto_id)
            .filter(
                MovimientoInventario.tipo == "entrada",
                and_(
                    MovimientoInventario.created_at >= dt_inicio,
                    MovimientoInventario.created_at <= dt_fin,
                ),
            )
            .order_by(MovimientoInventario.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        result = []
        for mov, ref, mat in rows:
            result.append({
                "id": mov.id,
                "producto_id": mov.producto_id,
                "producto_referencia": ref or "",
                "producto_material": mat or "",
                "cantidad": mov.cantidad,
                "created_at": mov.created_at,
            })
        return result

    def get_by_id(self, mov_id: int) -> MovimientoInventario | None:
        return self.db.query(MovimientoInventario).filter(MovimientoInventario.id == mov_id).first()
