import { api } from '@/shared/services/api'
import type { Remision } from '../types/remision.types'

export const remisionService = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get<Remision[]>('/remisiones', { params }).then((r) => r.data).catch(() => []),
}
