export interface Cliente {
  id: number
  codigo: string
  nombre: string
  nit?: string
  razon_social?: string
  nombre_gerente?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  departamento?: string
  vendedor_id?: number
  email?: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface ClienteCreate {
  codigo: string
  nombre: string
  nit?: string
  razon_social?: string
  nombre_gerente?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  departamento?: string
  vendedor_id?: number
  email?: string
  activo?: boolean
}

export interface ClienteUpdate {
  codigo?: string
  nombre?: string
  nit?: string
  razon_social?: string
  nombre_gerente?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  departamento?: string
  vendedor_id?: number
  email?: string
  activo?: boolean
}
