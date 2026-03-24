import asyncio
"""Router de pedidos."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas import (
    Pedido,
    PedidoConDetalles,
    PedidoCreate,
    PedidoUpdate,
    PedidoUpdateFull,
    PedidoIntencionUpdate,
    PedidoEnvioCreate,
    DetallePedido,
    DetallePedidoCreate,
    PedidoImpresoUpdate,
)
from app.services.pedido_service import PedidoService

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


def _es_vendedor_solo(db: Session, usuario: Usuario) -> bool:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    return "vendedor" in roles and "admin" not in roles


def _require_admin(db: Session, usuario: Usuario) -> None:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    if "admin" not in roles:
        raise HTTPException(403, "Solo administradores pueden realizar esta acción")


@router.get("/bulk", response_model=list[PedidoConDetalles])
def obtener_bulk(
    ids: str = Query(..., description="IDs de pedidos separados por coma, ej: 1,2,3"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """Trae varios pedidos con detalles en una sola consulta (evita N+1)."""
    id_list = [int(x.strip()) for x in ids.split(",") if x.strip()]
    if not id_list:
        return []
    es_vend = _es_vendedor_solo(db, current_user)
    return PedidoService(db).obtener_bulk(
        id_list,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )


@router.get("", response_model=list[Pedido])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    estados: str | None = Query(None, description="Filtrar por estados: en_espera,en_proceso"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    est_list = None
    if estados:
        est_list = [e.strip() for e in estados.split(",") if e.strip()]
    es_vend = _es_vendedor_solo(db, current_user)
    return PedidoService(db).listar(
        skip, limit, est_list,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )


@router.get("/{id:int}", response_model=PedidoConDetalles)
def obtener(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    es_vend = _es_vendedor_solo(db, current_user)
    return PedidoService(db).obtener(
        id,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )


@router.post("", response_model=PedidoConDetalles, status_code=201)
def crear(
    data: PedidoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return PedidoService(db).crear(data, current_user.id)


@router.put("/{id:int}", response_model=PedidoConDetalles)
def actualizar(
    id: int,
    data: PedidoUpdateFull,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    es_vend = _es_vendedor_solo(db, current_user)
    return PedidoService(db).actualizar(
        id, data, current_user.id,
        usuario_id_check=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )


@router.post("/{id:int}/detalles", response_model=DetallePedido, status_code=201)
def agregar_detalle(
    id: int,
    data: DetallePedidoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return PedidoService(db).agregar_detalle(id, data, current_user.id)


@router.patch("/{id:int}/intencion-envio", response_model=PedidoConDetalles)
def actualizar_intencion_envio(
    id: int,
    data: PedidoIntencionUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    es_vend = _es_vendedor_solo(db, current_user)
    return PedidoService(db).actualizar_intencion_envio(
        id, data.intencion_envio,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )


@router.patch("/{id:int}/estado", response_model=Pedido)
def cambiar_estado(
    id: int,
    data: PedidoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not data.estado:
        raise HTTPException(400, "Se requiere estado")
    es_vend = _es_vendedor_solo(db, current_user)
    return PedidoService(db).cambiar_estado(
        id, data.estado,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )


@router.patch("/{id:int}/impreso", response_model=Pedido)
def actualizar_impreso(
    id: int,
    data: PedidoImpresoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    es_vend = _es_vendedor_solo(db, current_user)
    return PedidoService(db).marcar_impreso(
        id,
        data.impreso,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )


@router.post("/{id:int}/enviar", response_model=PedidoConDetalles)
def marcar_enviado(
    id: int,
    data: PedidoEnvioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    es_vend = _es_vendedor_solo(db, current_user)
    return PedidoService(db).marcar_enviado(
        id, current_user.id,
        transportadora=data.transportadora,
        numero_factura=data.numero_factura,
        numero_guia=data.numero_guia,
        detalles_envio=data.detalles,
        resumen_envio=data.resumen_envio,
        usuario_id_check=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )


@router.post("/{id:int}/desmarcar-enviado", response_model=PedidoConDetalles)
def desmarcar_enviado(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    _require_admin(db, current_user)
    es_vend = _es_vendedor_solo(db, current_user)
    return PedidoService(db).desmarcar_enviado(
        id,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )
