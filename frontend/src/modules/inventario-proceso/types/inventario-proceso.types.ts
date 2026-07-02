export interface InventarioProceso {
  id: number
  referencia: string
  material: string
  cantidad: number
  created_at: string
  updated_at: string
}

export interface MovimientoInventarioProcesoCreate {
  referencia: string
  material: string
  tipo: 'entrada' | 'salida'
  cantidad: number
  usuario_realizo: string
}

export interface MovimientoInventarioProceso extends MovimientoInventarioProcesoCreate {
  id: number
  inventario_proceso_id: number
  registrada_por: string
  cantidad_anterior: number
  cantidad_nueva: number
  created_at: string
}