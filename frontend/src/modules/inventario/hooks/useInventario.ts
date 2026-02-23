import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventarioService } from '../services/inventario.service'
import { queryKeys } from '@/shared/query/queryKeys'
import type { MovimientoInventarioCreate } from '../types/inventario.types'

export function useInventarioList(params?: {
  pedido_ids?: string
  limit?: number
}) {
  return useQuery({
    queryKey: queryKeys.inventario.list(params),
    queryFn: () =>
      inventarioService.list({
        skip: 0,
        limit: params?.limit ?? 10000,
        pedido_ids: params?.pedido_ids,
      }),
  })
}

export function useInventarioRegistrarMovimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MovimientoInventarioCreate) =>
      inventarioService.registrarMovimiento(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.inventario.all }),
  })
}
