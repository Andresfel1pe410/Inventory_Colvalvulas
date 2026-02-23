import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clienteService } from '../services/cliente.service'
import { queryKeys } from '@/shared/query/queryKeys'
import type { ClienteCreate, ClienteUpdate } from '../types/cliente.types'

export function useClientesList(params?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.clientes.list(params),
    queryFn: () =>
      clienteService.list({
        skip: 0,
        limit: params?.limit ?? 10000,
        search: params?.search,
      }),
  })
}

export function useCliente(id: number | null) {
  return useQuery({
    queryKey: queryKeys.clientes.detail(id!),
    queryFn: () => clienteService.get(id!),
    enabled: id != null && id > 0,
  })
}

export function useClienteCreate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: ClienteCreate) => clienteService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clientes.all }),
  })
}

export function useClienteUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ClienteUpdate }) =>
      clienteService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.clientes.all })
      qc.invalidateQueries({ queryKey: queryKeys.clientes.detail(id) })
    },
  })
}

export function useClienteDelete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => clienteService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.clientes.all }),
  })
}
