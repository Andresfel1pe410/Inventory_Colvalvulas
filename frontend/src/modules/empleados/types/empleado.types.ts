export interface Empleado {
  id: number
  nombre: string
  documento: string
  cargo?: string
  telefono?: string
  activo: boolean
  fingerprint_id?: number
  solo_entrada_salida: boolean
  fecha_creacion: string
  updated_at: string
}

export interface EmpleadoCreate {
  nombre: string
  documento: string
  cargo?: string
  telefono?: string
  activo?: boolean
  fingerprint_id?: number
  solo_entrada_salida?: boolean
}

export interface EmpleadoUpdate {
  nombre?: string
  documento?: string
  cargo?: string
  telefono?: string
  activo?: boolean
  fingerprint_id?: number
  solo_entrada_salida?: boolean
}
