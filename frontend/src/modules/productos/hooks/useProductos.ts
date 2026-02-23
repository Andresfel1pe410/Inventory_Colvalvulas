import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productoService } from '../services/producto.service'
import { queryKeys } from '@/shared/query/queryKeys'
import type { ProductoCreate, ProductoUpdate } from '../types/producto.types'

export function useProductosList(params?: {
  search?: string
  limit?: number
  lista?: string
}) {
  return useQuery({
    queryKey: queryKeys.productos.list(params),
    queryFn: () =>
      productoService.list({
        skip: 0,
        limit: params?.limit ?? 10000,
        search: params?.search,
        lista: params?.lista,
      }),
  })
}

export function useProducto(id: number | null) {
  return useQuery({
    queryKey: queryKeys.productos.detail(id!),
    queryFn: () => productoService.get(id!),
    enabled: id != null && id > 0,
  })
}

export function useProductoCreate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ProductoCreate) => productoService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.productos.all }),
  })
}

export function useProductoUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductoUpdate }) =>
      productoService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.productos.all })
      qc.invalidateQueries({ queryKey: queryKeys.productos.detail(id) })
    },
  })
}

export function useProductoDelete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => productoService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.productos.all }),
  })
}
