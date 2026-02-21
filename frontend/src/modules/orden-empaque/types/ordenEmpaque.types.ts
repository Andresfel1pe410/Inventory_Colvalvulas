export interface DetalleEmpaque {
  id: number
  orden_empaque_id: number
  producto_id: number
  cantidad: number
  cantidad_empacada: number
}

export interface OrdenEmpaque {
  id: number
  pedido_id: number
  numero_orden: string
  estado: string
  usuario_id?: number
  created_at: string
  updated_at: string
}

export interface OrdenEmpaqueConDetalles extends OrdenEmpaque {
  detalles: DetalleEmpaque[]
}

export interface DetalleEmpaqueCreate {
  producto_id: number
  cantidad: number
}

export interface OrdenEmpaqueCreate {
  pedido_id: number
  detalles: DetalleEmpaqueCreate[]
}
