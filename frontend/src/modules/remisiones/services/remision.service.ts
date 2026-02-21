import { api } from '@/shared/services/api'
import type { Remision, RemisionCreate } from '../types/remision.types'

export const remisionService = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get<Remision[]>('/remisiones', { params }).then((r) => r.data).catch(() => []),

  create: (data: RemisionCreate) =>
    api.post<Remision>('/remisiones', data).then((r) => r.data),
}
