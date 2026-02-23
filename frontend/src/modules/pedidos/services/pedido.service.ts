import { api } from '@/shared/services/api'
import type {
  Pedido,
  PedidoConDetalles,
  PedidoCreate,
  PedidoUpdateFull,
  DetallePedido,
  DetallePedidoCreate,
} from '../types/pedido.types'

export interface DetalleEnvioCreate {
  producto_id: number
  cantidad_enviada: number
}

export interface PedidoEnvioCreate {
  transportadora: string
  numero_factura?: string
  numero_guia?: string
  detalles?: DetalleEnvioCreate[]
  resumen_envio?: string
}

export const pedidoService = {
  list: (params?: { skip?: number; limit?: number; estados?: string }) =>
    api.get<Pedido[]>('/pedidos', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<PedidoConDetalles>(`/pedidos/${id}`).then((r) => r.data),

  create: (data: PedidoCreate) =>
    api.post<PedidoConDetalles>('/pedidos', data).then((r) => r.data),

  addDetalle: (pedidoId: number, detalle: DetallePedidoCreate) =>
    api.post<DetallePedido>(`/pedidos/${pedidoId}/detalles`, detalle).then((r) => r.data),

  cambiarEstado: (id: number, estado: string) =>
    api.patch<Pedido>(`/pedidos/${id}/estado`, { estado }).then((r) => r.data),

  marcarEnviado: (id: number, data: PedidoEnvioCreate) =>
    api.post<PedidoConDetalles>(`/pedidos/${id}/enviar`, data).then((r) => r.data),

  desmarcarEnviado: (id: number) =>
    api.post<PedidoConDetalles>(`/pedidos/${id}/desmarcar-enviado`).then((r) => r.data),

  updateIntencionEnvio: (id: number, intencion_envio: 'enviar' | 'enviar_parcial' | 'no_enviar' | null) =>
    api.patch<PedidoConDetalles>(`/pedidos/${id}/intencion-envio`, { intencion_envio }).then((r) => r.data),

  update: (id: number, data: PedidoUpdateFull) =>
    api.put<PedidoConDetalles>(`/pedidos/${id}`, data).then((r) => r.data),
}
