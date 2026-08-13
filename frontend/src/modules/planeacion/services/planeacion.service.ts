import { procesoApi } from '@/shared/services/api'
import type {
  Dependencia,
  DependenciaCreate,
  DependenciaDetalle,
  DependenciaListItem,
  Tarea,
  TareaConDependencia,
  TareaCreate,
  TareaEstado,
} from '../types/planeacion.types'

export const planeacionService = {
  listarDependencias: (params?: { skip?: number; limit?: number }) =>
    procesoApi.get<DependenciaListItem[]>('/planeacion/dependencias', { params }).then((r) => r.data),

  crearDependencia: (data: DependenciaCreate) =>
    procesoApi.post<Dependencia>('/planeacion/dependencias', data).then((r) => r.data),

  obtenerDependencia: (id: number) =>
    procesoApi.get<DependenciaDetalle>(`/planeacion/dependencias/${id}`).then((r) => r.data),

  agregarEmpleado: (dependenciaId: number, empleadoId: number) =>
    procesoApi
      .post<DependenciaDetalle>(`/planeacion/dependencias/${dependenciaId}/empleados`, { empleado_id: empleadoId })
      .then((r) => r.data),

  quitarEmpleado: (dependenciaId: number, empleadoId: number) =>
    procesoApi
      .delete<DependenciaDetalle>(`/planeacion/dependencias/${dependenciaId}/empleados/${empleadoId}`)
      .then((r) => r.data),

  crearTarea: (dependenciaId: number, data: TareaCreate) =>
    procesoApi.post<Tarea>(`/planeacion/dependencias/${dependenciaId}/tareas`, data).then((r) => r.data),

  actualizarEstadoTarea: (dependenciaId: number, tareaId: number, estado: TareaEstado, realizado?: number) =>
    procesoApi
      .patch<Tarea>(`/planeacion/dependencias/${dependenciaId}/tareas/${tareaId}`, { estado, realizado })
      .then((r) => r.data),

  eliminarTarea: (dependenciaId: number, tareaId: number) =>
    procesoApi.delete(`/planeacion/dependencias/${dependenciaId}/tareas/${tareaId}`),

  listarMisTareas: () =>
    procesoApi.get<TareaConDependencia[]>('/planeacion/mis-tareas').then((r) => r.data),

  actualizarEstadoMiTarea: (tareaId: number, estado: TareaEstado, realizado?: number) =>
    procesoApi
      .patch<TareaConDependencia>(`/planeacion/mis-tareas/${tareaId}`, { estado, realizado })
      .then((r) => r.data),
}
