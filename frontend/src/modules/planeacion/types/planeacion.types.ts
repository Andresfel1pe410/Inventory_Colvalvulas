export type TareaEstado = 'pendiente' | 'en_progreso' | 'hecha'

export interface Dependencia {
  id: number
  nombre: string
  created_at: string
  updated_at: string
}

export interface DependenciaListItem extends Dependencia {
  empleados_count: number
}

export interface DependenciaCreate {
  nombre: string
  empleado_ids: number[]
}

export interface Tarea {
  id: number
  dependencia_id: number
  empleado_id: number
  descripcion: string
  cantidad: number
  realizado: number
  estado: TareaEstado
  created_at: string
  updated_at: string
}

export interface TareaCreate {
  empleado_id: number
  descripcion: string
  cantidad: number
}

export interface TareaEnDependencia {
  id: number
  descripcion: string
  cantidad: number
  realizado: number
  estado: TareaEstado
  created_at: string
  updated_at: string
}

export interface EmpleadoConTareas {
  empleado_id: number
  nombre: string
  cargo?: string
  tareas: TareaEnDependencia[]
}

export interface DependenciaDetalle {
  id: number
  nombre: string
  created_at: string
  updated_at: string
  empleados: EmpleadoConTareas[]
}

export interface TareaConDependencia extends Tarea {
  dependencia_nombre: string
}
