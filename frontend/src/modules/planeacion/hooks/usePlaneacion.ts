import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { planeacionService } from '../services/planeacion.service'
import { queryKeys } from '@/shared/query/queryKeys'
import type { DependenciaCreate, TareaCreate, TareaEstado } from '../types/planeacion.types'

export function useDependenciasList() {
  return useQuery({
    queryKey: queryKeys.planeacion.list,
    queryFn: () => planeacionService.listarDependencias({ limit: 1000 }),
  })
}

export function useDependenciaDetalle(id: number) {
  return useQuery({
    queryKey: queryKeys.planeacion.detail(id),
    queryFn: () => planeacionService.obtenerDependencia(id),
    enabled: id > 0,
  })
}

export function useDependenciaCreate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: DependenciaCreate) => planeacionService.crearDependencia(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.planeacion.list }),
  })
}

export function useAgregarEmpleado(dependenciaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (empleadoId: number) => planeacionService.agregarEmpleado(dependenciaId, empleadoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.planeacion.detail(dependenciaId) })
      qc.invalidateQueries({ queryKey: queryKeys.planeacion.list })
    },
  })
}

export function useQuitarEmpleado(dependenciaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (empleadoId: number) => planeacionService.quitarEmpleado(dependenciaId, empleadoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.planeacion.detail(dependenciaId) })
      qc.invalidateQueries({ queryKey: queryKeys.planeacion.list })
    },
  })
}

export function useCrearTarea(dependenciaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: TareaCreate) => planeacionService.crearTarea(dependenciaId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.planeacion.detail(dependenciaId) }),
  })
}

export function useActualizarEstadoTarea(dependenciaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tareaId,
      estado,
      realizado,
    }: {
      tareaId: number
      estado: TareaEstado
      realizado?: number
    }) => planeacionService.actualizarEstadoTarea(dependenciaId, tareaId, estado, realizado),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.planeacion.detail(dependenciaId) }),
  })
}

export function useEliminarTarea(dependenciaId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (tareaId: number) => planeacionService.eliminarTarea(dependenciaId, tareaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.planeacion.detail(dependenciaId) }),
  })
}

export function useMisTareas() {
  return useQuery({
    queryKey: queryKeys.planeacion.misTareas,
    queryFn: () => planeacionService.listarMisTareas(),
  })
}

export function useActualizarMiTarea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tareaId,
      estado,
      realizado,
    }: {
      tareaId: number
      estado: TareaEstado
      realizado?: number
    }) => planeacionService.actualizarEstadoMiTarea(tareaId, estado, realizado),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.planeacion.misTareas }),
  })
}
