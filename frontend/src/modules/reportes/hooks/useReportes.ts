import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/queryKeys'
import { reportesService } from '../services/reportes.service'

export function useVentasVendedores(params?: { year?: number; month?: number }) {
  return useQuery({
    queryKey: queryKeys.reportes.ventasVendedores(params),
    queryFn: () => reportesService.ventasVendedores(params),
  })
}

export function useVentasVendedorPedidos(params: { year?: number; month?: number; usuarioId: number | null }) {
  return useQuery({
    queryKey: ['reportes', 'ventas-vendedor-pedidos', params] as const,
    queryFn: () =>
      reportesService.ventasVendedorPedidos({
        year: params.year,
        month: params.month,
        usuarioId: params.usuarioId as number,
      }),
    enabled: params.usuarioId != null && params.usuarioId > 0,
  })
}

