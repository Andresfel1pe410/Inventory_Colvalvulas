import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { empleadoService } from '../services/empleado.service'
import { queryKeys } from '@/shared/query/queryKeys'
import type { EmpleadoCreate, EmpleadoUpdate } from '../types/empleado.types'

export function useEmpleadosList(params?: { search?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.empleados.list(params),
    queryFn: () =>
      empleadoService.list({
        skip: 0,
        limit: params?.limit ?? 1000,
        search: params?.search,
      }),
  })
}

export function useEmpleado(id: number | null) {
  return useQuery({
    queryKey: queryKeys.empleados.detail(id!),
    queryFn: () => empleadoService.get(id!),
    enabled: id != null && id > 0,
  })
}

export function useEmpleadoCreate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EmpleadoCreate) => empleadoService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.empleados.all }),
  })
}

export function useEmpleadoUpdate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmpleadoUpdate }) =>
      empleadoService.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.empleados.all })
      qc.invalidateQueries({ queryKey: queryKeys.empleados.detail(id) })
    },
  })
}

export function useEmpleadoDelete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => empleadoService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.empleados.all }),
  })
}
