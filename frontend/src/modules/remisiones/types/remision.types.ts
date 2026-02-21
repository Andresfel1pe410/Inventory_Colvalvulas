export interface DetalleRemision {
  id: number
  remision_id: number
  producto_id: number
  cantidad: number
}

export interface Remision {
  id: number
  numero_remision: string
  pedido_id?: number
  orden_empaque_id?: number
  cliente_id: number
  estado: string
  fecha_emision?: string
  fecha_entrega?: string
  created_at: string
  updated_at: string
  /** Datos del pedido asociado */
  numero_pedido?: string
  numero_factura?: string
  numero_guia?: string
  transportadora?: string
}

export interface RemisionCreate {
  orden_empaque_id: number
  cliente_id: number
  detalles: { producto_id: number; cantidad: number }[]
}
