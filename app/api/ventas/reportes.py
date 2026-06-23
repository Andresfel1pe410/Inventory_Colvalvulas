"""Router de reportes (solo admin)."""
from __future__ import annotations

import calendar
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth.jwt import get_current_user
from app.core.database import get_db
from app.models import Pedido, Usuario, Cliente, DetallePedido, Producto
from app.repositories.usuario_repository import UsuarioRepository

router = APIRouter(prefix="/reportes", tags=["reportes"])


def _require_admin(db: Session, usuario: Usuario) -> None:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    if "admin" not in roles:
        raise HTTPException(403, "Solo administradores pueden acceder")


@router.get("/ventas-vendedores")
def ventas_por_vendedor_mes(
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Ventas por vendedor (líneas) y total (línea) en el mes indicado.
    Solo incluye pedidos con estado 'enviado'.

    Eje X: días del mes (1..N)
    Eje Y: total en pesos (COP)
    """
    _require_admin(db, current_user)

    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month

    _, days_in_month = calendar.monthrange(y, m)
    start = datetime(y, m, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(y, m, days_in_month, 23, 59, 59, tzinfo=timezone.utc)

    # Agrupar por día (fecha_envio) y vendedor (usuario_id)
    rows = (
        db.query(
            Pedido.usuario_id.label("usuario_id"),
            func.date(Pedido.fecha_envio).label("dia"),
            func.coalesce(func.sum(Pedido.total), 0).label("total"),
        )
        .filter(
            Pedido.estado == "enviado",
            Pedido.fecha_envio.isnot(None),
            Pedido.fecha_envio >= start,
            Pedido.fecha_envio <= end,
        )
        .group_by(Pedido.usuario_id, func.date(Pedido.fecha_envio))
        .all()
    )

    # Usuarios presentes en el mes (solo los que vendieron)
    usuario_ids = sorted({int(r.usuario_id) for r in rows if r.usuario_id is not None})
    usuarios = (
        db.query(Usuario.id, Usuario.nombre, Usuario.apellido)
        .filter(Usuario.id.in_(usuario_ids))
        .all()
        if usuario_ids
        else []
    )
    usuario_nombre: dict[int, str] = {
        int(u.id): f"{u.nombre} {u.apellido}".strip() for u in usuarios
    }

    # Inicializar series por vendedor
    series: dict[int, list[float]] = {uid: [0.0] * days_in_month for uid in usuario_ids}
    total_series: list[float] = [0.0] * days_in_month

    for r in rows:
        uid = int(r.usuario_id)
        if not r.dia:
            continue
        if isinstance(r.dia, datetime):
            d: date = r.dia.date()
        else:
            d = r.dia
        idx = d.day - 1
        val = float(r.total or 0)
        if uid in series and 0 <= idx < days_in_month:
            series[uid][idx] = val
            total_series[idx] += val

    vendedores = []
    for uid in usuario_ids:
        vendedores.append(
            {
                "usuario_id": uid,
                "nombre": usuario_nombre.get(uid, f"Usuario #{uid}"),
                "total_mes": float(sum(series[uid])),
            }
        )
    vendedores.sort(key=lambda x: x["total_mes"], reverse=True)

    # Top clientes por total del mes (solo enviados)
    top_clientes_rows = (
        db.query(
            Pedido.cliente_id,
            func.sum(Pedido.total).label("total"),
            Cliente.razon_social,
        )
        .join(Cliente, Cliente.id == Pedido.cliente_id)
        .filter(
            Pedido.estado == "enviado",
            Pedido.fecha_envio.isnot(None),
            Pedido.fecha_envio >= start,
            Pedido.fecha_envio <= end,
        )
        .group_by(Pedido.cliente_id, Cliente.razon_social)
        .order_by(func.sum(Pedido.total).desc())
        .all()
    )
    top_clientes = [
        {
            "cliente_id": int(cid),
            "nombre": raz or f"Cliente #{cid}",
            "total_mes": float(total or 0),
        }
        for cid, total, raz in top_clientes_rows
    ]

    # Top productos por cantidad fabricada (cantidad en detalles de pedidos enviados)
    top_productos_rows = (
        db.query(
            DetallePedido.producto_id,
            func.sum(DetallePedido.cantidad).label("cantidad"),
            Producto.referencia,
            Producto.material,
        )
        .join(Pedido, DetallePedido.pedido_id == Pedido.id)
        .join(Producto, Producto.id == DetallePedido.producto_id)
        .filter(
            Pedido.estado == "enviado",
            Pedido.fecha_envio.isnot(None),
            Pedido.fecha_envio >= start,
            Pedido.fecha_envio <= end,
        )
        .group_by(DetallePedido.producto_id, Producto.referencia, Producto.material)
        .order_by(func.sum(DetallePedido.cantidad).desc())
        .all()
    )
    top_productos = [
        {
            "producto_id": int(pid),
            "referencia": ref or f"Producto #{pid}",
            "material": mat or "",
            "cantidad": int(cant or 0),
        }
        for pid, cant, ref, mat in top_productos_rows
    ]

    # Promedio de días entre creación y envío (solo enviados en el rango)
    avg_days_row = (
        db.query(
            func.avg(
                func.extract("epoch", Pedido.fecha_envio - Pedido.created_at)
            ).label("avg_seconds")
        )
        .filter(
            Pedido.estado == "enviado",
            Pedido.fecha_envio.isnot(None),
            Pedido.fecha_envio >= start,
            Pedido.fecha_envio <= end,
        )
        .one()
    )
    avg_days = None
    if avg_days_row and avg_days_row.avg_seconds is not None:
        avg_days = float(avg_days_row.avg_seconds) / 86400.0

    return {
        "year": y,
        "month": m,
        "days": list(range(1, days_in_month + 1)),
        "series": [
            {
                "key": "total",
                "label": "Total",
                "values": total_series,
            },
            *[
                {
                    "key": str(uid),
                    "label": usuario_nombre.get(uid, f"Usuario #{uid}"),
                    "values": series[uid],
                }
                for uid in usuario_ids
            ],
        ],
        "vendedores": vendedores,
        "total_mes": float(sum(total_series)),
        "top_clientes": top_clientes,
        "top_productos": top_productos,
        "avg_dias_envio": avg_days,
    }


@router.get("/top-clientes-productos")
def top_clientes_productos_acumulado(
    year: int = Query(..., ge=2000, le=2100),
    months: str = Query(..., description="Meses separados por coma, ej: 1,2,3"),
    limit: int = Query(15, ge=0, le=5000, description="0 = sin límite (reporte completo)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Top clientes y productos acumulado sobre los meses seleccionados (solo pedidos enviados).
    """
    _require_admin(db, current_user)

    month_list = [int(m.strip()) for m in months.split(",") if m.strip()]
    if not month_list:
        raise HTTPException(400, "Debe indicar al menos un mes válido")

    start = datetime(year, min(month_list), 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(year, max(month_list), 31, 23, 59, 59, tzinfo=timezone.utc)

    clientes_q = (
        db.query(
            Pedido.cliente_id,
            Cliente.razon_social,
            func.sum(Pedido.total).label("total"),
        )
        .join(Cliente, Cliente.id == Pedido.cliente_id)
        .filter(
            Pedido.estado == "enviado",
            Pedido.fecha_envio.isnot(None),
            Pedido.fecha_envio >= start,
            Pedido.fecha_envio <= end,
        )
        .group_by(Pedido.cliente_id, Cliente.razon_social)
        .order_by(func.sum(Pedido.total).desc())
    )
    if limit > 0:
        clientes_q = clientes_q.limit(limit)
    top_clientes_rows = clientes_q.all()

    productos_q = (
        db.query(
            DetallePedido.producto_id,
            Producto.referencia,
            Producto.material,
            func.sum(DetallePedido.cantidad).label("cantidad"),
        )
        .join(Pedido, DetallePedido.pedido_id == Pedido.id)
        .join(Producto, Producto.id == DetallePedido.producto_id)
        .filter(
            Pedido.estado == "enviado",
            Pedido.fecha_envio.isnot(None),
            Pedido.fecha_envio >= start,
            Pedido.fecha_envio <= end,
        )
        .group_by(DetallePedido.producto_id, Producto.referencia, Producto.material)
        .order_by(func.sum(DetallePedido.cantidad).desc())
    )
    if limit > 0:
        productos_q = productos_q.limit(limit)
    top_productos_rows = productos_q.all()

    return {
        "year": year,
        "months": month_list,
        "top_clientes": [
            {
                "cliente_id": int(cid),
                "nombre": raz or f"Cliente #{cid}",
                "total_mes": float(total or 0),
            }
            for cid, raz, total in top_clientes_rows
        ],
        "top_productos": [
            {
                "producto_id": int(pid),
                "referencia": ref or f"Producto #{pid}",
                "material": mat or "",
                "cantidad": int(cant or 0),
            }
            for pid, ref, mat, cant in top_productos_rows
        ],
    }
