import { procesoApi } from '@/shared/services/api'
import type {
  InventarioProceso,
  MovimientoInventarioProceso,
  MovimientoInventarioProcesoCreate,
} from '../types/inventario-proceso.types'

export const inventarioProcesoService = {
  list: (params?: { skip?: number; limit?: number }) =>
    procesoApi.get<InventarioProceso[]>('/inventario-proceso', { params }).then((r) => r.data),

  registrarMovimiento: (data: MovimientoInventarioProcesoCreate) =>
    procesoApi.post<MovimientoInventarioProceso>('/inventario-proceso/movimientos', data).then((r) => r.data),

  listarMovimientos: (params?: {
    inventario_proceso_id?: number
    skip?: number
    limit?: number
  }) =>
    procesoApi
      .get<MovimientoInventarioProceso[]>('/inventario-proceso/movimientos', { params })
      .then((r) => r.data),
}