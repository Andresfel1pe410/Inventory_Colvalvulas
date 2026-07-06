export type EstadoCliente = 'enviar' | 'enviar_parcial' | 'no_enviar' | 'solo_contado'

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
  estado_cliente: EstadoCliente
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
  estado_cliente?: EstadoCliente
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
  estado_cliente?: EstadoCliente
}

export const TIPOS_DOCUMENTO = ['NIT', 'CC'] as const

export const ESTADO_CLIENTE_LABELS: Record<EstadoCliente, string> = {
  enviar: 'Enviar',
  enviar_parcial: 'Enviar Parcial',
  no_enviar: 'No enviar',
  solo_contado: 'Solo De Contado',
}
