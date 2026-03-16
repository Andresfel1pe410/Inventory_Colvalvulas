import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/queryKeys'
import { reportesService } from '../services/reportes.service'

export function useTopClientesProductosAcumulado(params: { year: number; months: number[] } | null) {
  return useQuery({
    queryKey: queryKeys.reportes.topAcumulado(params ?? { year: 0, months: [] }),
    queryFn: () => {
      if (!params || params.months.length === 0) return Promise.resolve(null)
      return reportesService.topClientesProductosAcumulado(params)
    },
    enabled: !!params && params.months.length > 0,
  })
}

