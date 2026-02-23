import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { pedidoService } from '../services/pedido.service'
import { queryKeys } from '@/shared/query/queryKeys'
import type {
  PedidoCreate,
  PedidoUpdateFull,
  DetallePedidoCreate,
} from '../types/pedido.types'
import type { PedidoEnvioCreate } from '../services/pedido.service'

export function usePedidosList(params?: {
  skip?: number
  limit?: number
  estados?: string
}) {
  return useQuery({
    queryKey: queryKeys.pedidos.list(params),
    queryFn: () => pedidoService.list(params),
  })
}

export function usePedido(id: number | null) {
  return useQuery({
    queryKey: queryKeys.pedidos.detail(id!),
    queryFn: () => pedidoService.get(id!),
    enabled: id != null && id > 0,
  })
}

export function usePedidosDetails(ids: number[]) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.pedidos.detail(id),
      queryFn: () => pedidoService.get(id),
      enabled: ids.length > 0,
    })),
  })
  const map: Record<number, Awaited<ReturnType<typeof pedidoService.get>>> = {}
  results.forEach((r) => {
    if (r.data) map[r.data.id] = r.data
  })
  return map
}

export function usePedidoCreate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: PedidoCreate) => pedidoService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.pedidos.all }),
  })
}

export function usePedidoUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PedidoUpdateFull }) =>
      pedidoService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.all })
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.detail(id) })
    },
  })
}

export function usePedidoAddDetalle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      pedidoId,
      detalle,
    }: {
      pedidoId: number
      detalle: DetallePedidoCreate
    }) => pedidoService.addDetalle(pedidoId, detalle),
    onSuccess: (_, { pedidoId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.all })
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.detail(pedidoId) })
    },
  })
}

export function usePedidoCambiarEstado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      pedidoService.cambiarEstado(id, estado),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.all })
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.detail(id) })
    },
  })
}

export function usePedidoMarcarEnviado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PedidoEnvioCreate }) =>
      pedidoService.marcarEnviado(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.all })
      qc.invalidateQueries({ queryKey: queryKeys.remisiones.all })
      qc.invalidateQueries({ queryKey: queryKeys.inventario.all })
    },
  })
}

export function usePedidoDesmarcarEnviado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => pedidoService.desmarcarEnviado(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.all })
      qc.invalidateQueries({ queryKey: queryKeys.remisiones.all })
      qc.invalidateQueries({ queryKey: queryKeys.inventario.all })
    },
  })
}

export function usePedidoUpdateIntencionEnvio() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      intencion_envio,
    }: {
      id: number
      intencion_envio: 'enviar' | 'enviar_parcial' | 'no_enviar' | null
    }) => pedidoService.updateIntencionEnvio(id, intencion_envio),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.all })
      qc.invalidateQueries({ queryKey: queryKeys.pedidos.detail(id) })
    },
  })
}
