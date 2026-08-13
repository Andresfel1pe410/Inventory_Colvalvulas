import { rrhhApi } from '@/shared/services/api'
import type {
  Empleado,
  EmpleadoAccesoCreate,
  EmpleadoAccesoEstado,
  EmpleadoCreate,
  EmpleadoUpdate,
} from '../types/empleado.types'

export const empleadoService = {
  list: (params?: { skip?: number; limit?: number; search?: string }) =>
    rrhhApi.get<Empleado[]>('/empleados', { params }).then((r) => r.data),

  get: (id: number) => rrhhApi.get<Empleado>(`/empleados/${id}`).then((r) => r.data),

  create: (data: EmpleadoCreate) => rrhhApi.post<Empleado>('/empleados', data).then((r) => r.data),

  update: (id: number, data: EmpleadoUpdate) =>
    rrhhApi.put<Empleado>(`/empleados/${id}`, data).then((r) => r.data),

  delete: (id: number) => rrhhApi.delete(`/empleados/${id}`),

  getAcceso: (id: number) => rrhhApi.get<EmpleadoAccesoEstado>(`/empleados/${id}/acceso`).then((r) => r.data),

  crearAcceso: (id: number, data: EmpleadoAccesoCreate) =>
    rrhhApi.post<EmpleadoAccesoEstado>(`/empleados/${id}/acceso`, data).then((r) => r.data),
}
