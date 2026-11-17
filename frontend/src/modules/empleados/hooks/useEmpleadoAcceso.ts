import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { empleadoService } from '../services/empleado.service'
import type { EmpleadoAccesoCreate } from '../types/empleado.types'

const accesoKey = (empleadoId: number) => ['empleados', empleadoId, 'acceso'] as const

export function useEmpleadoAcceso(empleadoId: number | null) {
  return useQuery({
    queryKey: accesoKey(empleadoId ?? 0),
    queryFn: () => empleadoService.getAcceso(empleadoId!),
    enabled: empleadoId != null && empleadoId > 0,
  })
}

export function useCrearAcceso(empleadoId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: EmpleadoAccesoCreate) => empleadoService.crearAcceso(empleadoId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: accesoKey(empleadoId) }),
  })
}
