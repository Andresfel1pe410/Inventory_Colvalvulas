"""Router de reportes (solo admin)."""
from __future__ import annotations

import calendar
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.auth.jwt import get_current_user
from app.api.deps import require_admin
from app.core.database import get_db
from app.models import Pedido, Usuario, Cliente, DetallePedido, Producto, Inventario

router = APIRouter(prefix="/reportes", tags=["reportes"])


@router.get("/ventas-vendedores")
def ventas_por_vendedor_mes(
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    """
    Ventas por vendedor (líneas) y total (línea) en el mes indicado.
    Solo incluye pedidos con estado 'enviado'.

    Eje X: días del mes (1..N)
    Eje Y: total en pesos (COP)
    """
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
        elif isinstance(r.dia, str):
            d = datetime.strptime(r.dia, "%Y-%m-%d").date()
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
    # Cantidad de unidades compradas por cliente -- consulta aparte para no
    # duplicar Pedido.total por el fan-out del join con DetallePedido.
    cantidad_por_cliente = {
        int(cid): int(cant or 0)
        for cid, cant in (
            db.query(
                Pedido.cliente_id,
                func.sum(DetallePedido.cantidad).label("cantidad"),
            )
            .join(DetallePedido, DetallePedido.pedido_id == Pedido.id)
            .filter(
                Pedido.estado == "enviado",
                Pedido.fecha_envio.isnot(None),
                Pedido.fecha_envio >= start,
                Pedido.fecha_envio <= end,
            )
            .group_by(Pedido.cliente_id)
            .all()
        )
    }
    top_clientes = [
        {
            "cliente_id": int(cid),
            "nombre": raz or f"Cliente #{cid}",
            "total_mes": float(total or 0),
            "cantidad": cantidad_por_cliente.get(int(cid), 0),
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


@router.get("/ventas-vendedores/{usuario_id}/pedidos")
def ventas_vendedor_pedidos_mes(
    usuario_id: int,
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    """Pedidos enviados de un vendedor en el mes indicado."""
    now = datetime.now(timezone.utc)
    y = year or now.year
    m = month or now.month

    _, days_in_month = calendar.monthrange(y, m)
    start = datetime(y, m, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(y, m, days_in_month, 23, 59, 59, tzinfo=timezone.utc)

    vendedor = db.query(Usuario.id, Usuario.nombre, Usuario.apellido, Usuario.email).filter(Usuario.id == usuario_id).first()
    if not vendedor:
        raise HTTPException(404, "Vendedor no encontrado")

    pedidos_rows = (
        db.query(
            Pedido.id,
            Pedido.numero_pedido,
            Pedido.total,
            Pedido.fecha_envio,
            Pedido.observaciones,
            Cliente.razon_social.label("cliente_nombre"),
        )
        .join(Cliente, Cliente.id == Pedido.cliente_id)
        .filter(
            Pedido.estado == "enviado",
            Pedido.usuario_id == usuario_id,
            Pedido.fecha_envio.isnot(None),
            Pedido.fecha_envio >= start,
            Pedido.fecha_envio <= end,
        )
        .order_by(Pedido.fecha_envio.desc(), Pedido.id.desc())
        .all()
    )

    vendedor_nombre = f"{vendedor.nombre} {vendedor.apellido}".strip() or vendedor.email

    return {
        "year": y,
        "month": m,
        "usuario_id": int(vendedor.id),
        "vendedor": vendedor_nombre,
        "pedidos": [
            {
                "pedido_id": int(pid),
                "numero_pedido": numero,
                "cliente": cliente_nombre,
                "total": float(total or 0),
                "fecha_envio": fecha.isoformat() if fecha else None,
                "observaciones": observaciones,
            }
            for pid, numero, total, fecha, observaciones, cliente_nombre in pedidos_rows
        ],
        "total_vendido": float(sum(float(total or 0) for _, _, total, _, _, _ in pedidos_rows)),
        "cantidad_pedidos": len(pedidos_rows),
    }


@router.get("/top-clientes-productos")
def top_clientes_productos_acumulado(
    year: int = Query(..., ge=2000, le=2100),
    months: str = Query(..., description="Meses separados por coma, ej: 1,2,3"),
    limit: int = Query(15, ge=0, le=5000, description="0 = sin límite (reporte completo)"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    _admin: Usuario = Depends(require_admin),
):
    """
    Top clientes y productos acumulado sobre los meses seleccionados (solo pedidos enviados).
    """
    month_list = [int(m.strip()) for m in months.split(",") if m.strip()]
    if not month_list:
        raise HTTPException(400, "Debe indicar al menos un mes válido")

    _, last_day = calendar.monthrange(year, max(month_list))
    start = datetime(year, min(month_list), 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(year, max(month_list), last_day, 23, 59, 59, tzinfo=timezone.utc)

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

    # Cantidad de unidades compradas por cliente -- consulta aparte para no
    # duplicar Pedido.total por el fan-out del join con DetallePedido.
    cantidad_por_cliente = {
        int(cid): int(cant or 0)
        for cid, cant in (
            db.query(
                Pedido.cliente_id,
                func.sum(DetallePedido.cantidad).label("cantidad"),
            )
            .join(DetallePedido, DetallePedido.pedido_id == Pedido.id)
            .filter(
                Pedido.estado == "enviado",
                Pedido.fecha_envio.isnot(None),
                Pedido.fecha_envio >= start,
                Pedido.fecha_envio <= end,
            )
            .group_by(Pedido.cliente_id)
            .all()
        )
    }

    # "Disponible" = stock_actual menos lo requerido por pedidos aún no enviados
    # (misma definición que usa el módulo de Inventario).
    requerido_subq = (
        db.query(
            DetallePedido.producto_id.label("producto_id"),
            func.sum(DetallePedido.cantidad).label("requerido"),
        )
        .join(Pedido, Pedido.id == DetallePedido.pedido_id)
        .filter(Pedido.estado.in_(("en_espera", "en_proceso")))
        .group_by(DetallePedido.producto_id)
        .subquery()
    )

    productos_q = (
        db.query(
            DetallePedido.producto_id,
            Producto.referencia,
            Producto.material,
            func.sum(DetallePedido.cantidad).label("cantidad"),
            func.coalesce(Inventario.stock_actual, 0).label("stock_actual"),
            func.coalesce(requerido_subq.c.requerido, 0).label("requerido"),
        )
        .join(Pedido, DetallePedido.pedido_id == Pedido.id)
        .join(Producto, Producto.id == DetallePedido.producto_id)
        .outerjoin(Inventario, Inventario.producto_id == Producto.id)
        .outerjoin(requerido_subq, requerido_subq.c.producto_id == Producto.id)
        .filter(
            Pedido.estado == "enviado",
            Pedido.fecha_envio.isnot(None),
            Pedido.fecha_envio >= start,
            Pedido.fecha_envio <= end,
        )
        .group_by(
            DetallePedido.producto_id,
            Producto.referencia,
            Producto.material,
            Inventario.stock_actual,
            requerido_subq.c.requerido,
        )
        .order_by(func.sum(DetallePedido.cantidad).desc())
    )
    if limit > 0:
        productos_q = productos_q.limit(limit)
    top_productos_rows = productos_q.all()

    num_meses = len(month_list)

    top_productos = []
    for pid, ref, mat, cant, stock, requerido in top_productos_rows:
        promedio = float(cant or 0) / num_meses
        disponible = int(stock or 0) - int(requerido or 0)
        top_productos.append(
            {
                "producto_id": int(pid),
                "referencia": ref or f"Producto #{pid}",
                "material": mat or "",
                "cantidad": int(cant or 0),
                "promedio": promedio,
                "stock_actual": int(stock or 0),
                "disponible": disponible,
                "produccion": disponible - promedio,
            }
        )

    return {
        "year": year,
        "months": month_list,
        "top_clientes": [
            {
                "cliente_id": int(cid),
                "nombre": raz or f"Cliente #{cid}",
                "total": float(total or 0),
                "promedio": float(total or 0) / num_meses,
                "cantidad": cantidad_por_cliente.get(int(cid), 0),
            }
            for cid, raz, total in top_clientes_rows
        ],
        "top_productos": top_productos,
    }
