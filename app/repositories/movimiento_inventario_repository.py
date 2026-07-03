"""Repositorio de movimientos de inventario."""
from datetime import datetime, date

from sqlalchemy import and_, func

from app.models import MovimientoInventario, Producto, Remision, Pedido, Cliente


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

    def get_reporte_movimientos(
        self,
        fecha_inicio: date,
        fecha_fin: date,
        skip: int = 0,
        limit: int = 5000,
    ) -> list[dict]:
        """Lista movimientos de entrada y salida con contexto de pedido/remisión."""
        dt_inicio = datetime.combine(fecha_inicio, datetime.min.time())
        dt_fin = datetime.combine(fecha_fin, datetime.max.time())

        rows = (
            self.db.query(
                MovimientoInventario.id,
                MovimientoInventario.producto_id,
                MovimientoInventario.tipo,
                MovimientoInventario.cantidad,
                MovimientoInventario.stock_anterior,
                MovimientoInventario.stock_nuevo,
                MovimientoInventario.referencia_tipo,
                MovimientoInventario.referencia_id,
                MovimientoInventario.motivo,
                MovimientoInventario.created_at,
                Producto.referencia,
                Producto.material,
                Pedido.id.label("pedido_id"),
                Pedido.numero_pedido,
                Cliente.razon_social,
                Remision.numero_remision,
            )
            .join(Producto, Producto.id == MovimientoInventario.producto_id)
            .outerjoin(
                Remision,
                and_(
                    MovimientoInventario.referencia_tipo == "remision",
                    MovimientoInventario.referencia_id == Remision.id,
                ),
            )
            .outerjoin(Pedido, Pedido.id == Remision.pedido_id)
            .outerjoin(Cliente, Cliente.id == Pedido.cliente_id)
            .filter(
                MovimientoInventario.tipo.in_(["entrada", "salida"]),
                and_(
                    MovimientoInventario.created_at >= dt_inicio,
                    MovimientoInventario.created_at <= dt_fin,
                ),
            )
            .order_by(MovimientoInventario.created_at.desc(), MovimientoInventario.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        result = []
        for (
            mov_id,
            producto_id,
            tipo,
            cantidad,
            stock_anterior,
            stock_nuevo,
            referencia_tipo,
            referencia_id,
            motivo,
            created_at,
            ref,
            mat,
            pedido_id,
            numero_pedido,
            razon_social,
            numero_remision,
        ) in rows:
            result.append(
                {
                    "id": mov_id,
                    "producto_id": producto_id,
                    "producto_referencia": ref or "",
                    "producto_material": mat or "",
                    "tipo": tipo,
                    "cantidad": cantidad,
                    "stock_anterior": stock_anterior,
                    "stock_nuevo": stock_nuevo,
                    "referencia_tipo": referencia_tipo,
                    "referencia_id": referencia_id,
                    "pedido_id": pedido_id,
                    "numero_pedido": numero_pedido,
                    "cliente_razon_social": razon_social,
                    "numero_remision": numero_remision,
                    "motivo": motivo,
                    "created_at": created_at,
                }
            )
        return result

    def get_by_id(self, mov_id: int) -> MovimientoInventario | None:
        return self.db.query(MovimientoInventario).filter(MovimientoInventario.id == mov_id).first()
