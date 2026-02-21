import { api } from '@/shared/services/api'
import type { Inventario, InventarioResumen, MovimientoInventario, MovimientoInventarioCreate } from '../types/inventario.types'

export const inventarioService = {
  list: (params?: { skip?: number; limit?: number; pedido_ids?: string }) =>
    api.get<InventarioResumen[]>('/inventario', { params }).then((r) => r.data),

  getByProducto: (productoId: number) =>
    api.get<Inventario>(`/inventario/producto/${productoId}`).then((r) => r.data),

  registrarMovimiento: (data: MovimientoInventarioCreate) =>
    api.post<MovimientoInventario>('/inventario/movimientos', data).then((r) => r.data),
}
