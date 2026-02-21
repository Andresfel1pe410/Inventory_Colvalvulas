export interface Inventario {
  id: number
  producto_id: number
  stock_actual: number
  stock_minimo: number
  ubicacion?: string
  created_at: string
  updated_at: string
}

export interface InventarioResumen extends Inventario {
  cantidad_requerida: number
  stock_disponible: number
}

export interface MovimientoInventarioCreate {
  producto_id: number
  tipo: 'entrada' | 'salida' | 'ajuste'
  cantidad: number
  motivo?: string
  referencia_tipo?: string
  referencia_id?: number
}

export interface MovimientoInventario extends MovimientoInventarioCreate {
  id: number
  stock_anterior: number
  stock_nuevo: number
  usuario_id?: number
  created_at: string
}
