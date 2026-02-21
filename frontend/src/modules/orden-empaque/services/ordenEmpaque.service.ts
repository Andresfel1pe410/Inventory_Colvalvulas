import { api } from '@/shared/services/api'
import type {
  OrdenEmpaque,
  OrdenEmpaqueConDetalles,
  OrdenEmpaqueCreate,
} from '../types/ordenEmpaque.types'

export const ordenEmpaqueService = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get<OrdenEmpaque[]>('/orden-empaque', { params }).then((r) => r.data),

  get: (id: number) =>
    api.get<OrdenEmpaqueConDetalles>(`/orden-empaque/${id}`).then((r) => r.data),

  create: (data: OrdenEmpaqueCreate) =>
    api.post<OrdenEmpaqueConDetalles>('/orden-empaque', data).then((r) => r.data),

  cerrar: (id: number) =>
    api.post<OrdenEmpaqueConDetalles>(`/orden-empaque/${id}/cerrar`).then((r) => r.data),
}
