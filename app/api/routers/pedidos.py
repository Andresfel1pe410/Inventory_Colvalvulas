"""Router de pedidos."""
from fastapi import APIRouter, Depends, Query
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
    PedidoEnvioCreate,
    DetallePedido,
    DetallePedidoCreate,
)
from app.services.pedido_service import PedidoService

router = APIRouter(prefix="/pedidos", tags=["pedidos"])


def _es_vendedor_solo(db: Session, usuario: Usuario) -> bool:
    roles = UsuarioRepository(db).get_roles(usuario.id)
    return "vendedor" in roles and "admin" not in roles


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


@router.get("/{id}", response_model=PedidoConDetalles)
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


@router.put("/{id}", response_model=PedidoConDetalles)
def actualizar(
    id: int,
    data: PedidoUpdateFull,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    es_vend = _es_vendedor_solo(db, current_user)
    PedidoService(db).actualizar(id, data, current_user.id)
    return PedidoService(db).obtener(
        id,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )


@router.post("/{id}/detalles", response_model=DetallePedido, status_code=201)
def agregar_detalle(
    id: int,
    data: DetallePedidoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    return PedidoService(db).agregar_detalle(id, data, current_user.id)


@router.patch("/{id}/estado", response_model=Pedido)
def cambiar_estado(
    id: int,
    data: PedidoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    if not data.estado:
        from fastapi import HTTPException
        raise HTTPException(400, "Se requiere estado")
    es_vend = _es_vendedor_solo(db, current_user)
    PedidoService(db).obtener(
        id,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )
    return PedidoService(db).cambiar_estado(id, data.estado)


@router.post("/{id}/enviar", response_model=PedidoConDetalles)
def marcar_enviado(
    id: int,
    data: PedidoEnvioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    es_vend = _es_vendedor_solo(db, current_user)
    PedidoService(db).obtener(
        id,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )
    pedido = PedidoService(db).marcar_enviado(
        id, current_user.id,
        transportadora=data.transportadora,
        numero_factura=data.numero_factura,
        numero_guia=data.numero_guia,
        detalles_envio=data.detalles,
        resumen_envio=data.resumen_envio,
    )
    return PedidoService(db).obtener(
        id,
        usuario_id=current_user.id if es_vend else None,
        es_vendedor=es_vend,
    )
