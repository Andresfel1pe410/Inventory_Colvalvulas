export interface Cliente {
  id: number
  razon_social: string
  tipo_documento: string
  numero_identificacion: string
  dv?: string
  regimen?: string
  pais?: string
  ciudad?: string
  direccion?: string
  telefono?: string
  departamento?: string
  codigo_postal?: string
  email?: string
  responsabilidad_fiscal?: string
  detalles_tributarios?: string
  vendedor?: string
  created_at: string
  updated_at: string
}

export interface ClienteCreate {
  razon_social: string
  tipo_documento: string
  numero_identificacion: string
  dv?: string
  regimen?: string
  pais?: string
  ciudad?: string
  direccion?: string
  telefono?: string
  departamento?: string
  codigo_postal?: string
  email?: string
  responsabilidad_fiscal?: string
  detalles_tributarios?: string
  vendedor?: string
}

export interface ClienteUpdate {
  razon_social?: string
  tipo_documento?: string
  numero_identificacion?: string
  dv?: string
  regimen?: string
  pais?: string
  ciudad?: string
  direccion?: string
  telefono?: string
  departamento?: string
  codigo_postal?: string
  email?: string
  responsabilidad_fiscal?: string
  detalles_tributarios?: string
  vendedor?: string
}

export const TIPOS_DOCUMENTO = ['NIT', 'CC'] as const
