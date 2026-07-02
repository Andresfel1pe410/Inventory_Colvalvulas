import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventarioProcesoService } from '../services/inventario-proceso.service'
import { queryKeys } from '@/shared/query/queryKeys'
import type { MovimientoInventarioProcesoCreate } from '../types/inventario-proceso.types'

export function useInventarioProcesoList(params?: {
  limit?: number
}) {
  return useQuery({
    queryKey: [queryKeys.inventario.proceso, params],
    queryFn: () =>
      inventarioProcesoService.list({
        skip: 0,
        limit: params?.limit ?? 10000,
      }),
  })
}

export function useInventarioProcesoRegistrarMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MovimientoInventarioProcesoCreate) =>
      inventarioProcesoService.registrarMovimiento(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [queryKeys.inventario.proceso] }),
  })
}

export function useInventarioProcesoMovimientos(params?: {
  inventario_proceso_id?: number
  enabled?: boolean
}) {
  return useQuery({
    queryKey: [queryKeys.inventario.proceso, 'movimientos', params],
    queryFn: () =>
      inventarioProcesoService.listarMovimientos({
        inventario_proceso_id: params?.inventario_proceso_id,
        skip: 0,
        limit: 1000,
      }),
    enabled:
      params?.enabled ??
      (params?.inventario_proceso_id === undefined ||
        params?.inventario_proceso_id === null ||
        params?.inventario_proceso_id > 0),
  })
}