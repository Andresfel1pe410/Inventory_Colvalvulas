export interface Cliente {
  id: number
  nit: string
  razon_social: string
  nombre_gerente?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  departamento?: string
  vendedor?: string
  email?: string
  created_at: string
  updated_at: string
}

export interface ClienteCreate {
  nit: string
  razon_social: string
  nombre_gerente?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  departamento?: string
  vendedor?: string
  email?: string
}

export interface ClienteUpdate {
  nit?: string
  razon_social?: string
  nombre_gerente?: string
  telefono?: string
  direccion?: string
  ciudad?: string
  departamento?: string
  vendedor?: string
  email?: string
}
