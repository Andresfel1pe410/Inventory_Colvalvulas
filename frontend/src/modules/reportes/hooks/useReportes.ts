import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/queryKeys'
import { reportesService } from '../services/reportes.service'

export function useVentasVendedores(params?: { year?: number; month?: number }) {
  return useQuery({
    queryKey: queryKeys.reportes.ventasVendedores(params),
    queryFn: () => reportesService.ventasVendedores(params),
  })
}

