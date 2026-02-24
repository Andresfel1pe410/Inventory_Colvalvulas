import { api } from '@/shared/services/api'
import type {
  Inventario,
  InventarioResumenConProducto,
  MovimientoInventario,
  MovimientoInventarioCreate,
} from '../types/inventario.types'

export interface MovimientoEntradaReporte {
  producto_id: number
  producto_referencia: string
  producto_material: string
  cantidad_total: number
}

export const inventarioService = {
  list: (params?: { skip?: number; limit?: number; pedido_ids?: string }) =>
    api.get<InventarioResumenConProducto[]>('/inventario', { params }).then((r) => r.data),

  getByProducto: (productoId: number) =>
    api.get<Inventario>(`/inventario/producto/${productoId}`).then((r) => r.data),

  listarEntradas: (params: {
    fecha_inicio: string
    fecha_fin: string
    skip?: number
    limit?: number
  }) =>
    api
      .get<MovimientoEntradaReporte[]>('/inventario/movimientos/entradas', {
        params,
      })
      .then((r) => r.data),

  registrarMovimiento: (data: MovimientoInventarioCreate) =>
    api.post<MovimientoInventario>('/inventario/movimientos', data).then((r) => r.data),
}
