import { api } from '@/shared/services/api'
import type { Producto, ProductoCreate, ProductoUpdate } from '../types/producto.types'

export const productoService = {
  list: (params?: {
    skip?: number
    limit?: number
    search?: string
    lista?: string
  }) => api.get<Producto[]>('/productos', { params }).then((r) => r.data),

  get: (id: number) => api.get<Producto>(`/productos/${id}`).then((r) => r.data),

  getByCodigo: (codigo: string, lista: string) =>
    api.get<Producto>('/productos/codigo/' + encodeURIComponent(codigo), { params: { lista } }).then((r) => r.data),

  create: (data: ProductoCreate) => api.post<Producto>('/productos', data).then((r) => r.data),

  update: (id: number, data: ProductoUpdate) =>
    api.put<Producto>(`/productos/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/productos/${id}`),
}
