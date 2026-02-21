import { api } from '@/shared/services/api'
import type { Cliente, ClienteCreate, ClienteUpdate } from '../types/cliente.types'

export const clienteService = {
  list: (params?: { skip?: number; limit?: number; search?: string }) =>
    api.get<Cliente[]>('/clientes', { params }).then((r) => r.data),

  get: (id: number) => api.get<Cliente>(`/clientes/${id}`).then((r) => r.data),

  create: (data: ClienteCreate) => api.post<Cliente>('/clientes', data).then((r) => r.data),

  update: (id: number, data: ClienteUpdate) =>
    api.put<Cliente>(`/clientes/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/clientes/${id}`),
}
