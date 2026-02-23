import { useQuery } from '@tanstack/react-query'
import { remisionService } from '../services/remision.service'
import { queryKeys } from '@/shared/query/queryKeys'

export function useRemisionesList(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.remisiones.list(params),
    queryFn: () => remisionService.list(params ?? {}),
  })
}
