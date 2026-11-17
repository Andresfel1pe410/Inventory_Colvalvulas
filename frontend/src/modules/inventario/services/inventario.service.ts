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

export interface MovimientoEntradaDetalle {
  id: number
  producto_id: number
  producto_referencia: string
  producto_material: string
  cantidad: number
  created_at: string
}

export interface MovimientoInventarioReporteDetalle {
  id: number
  producto_id: number
  producto_referencia: string
  producto_material: string
  tipo: 'entrada' | 'salida' | 'ajuste'
  cantidad: number
  stock_anterior: number
  stock_nuevo: number
  referencia_tipo?: string | null
  referencia_id?: number | null
  pedido_id?: number | null
  numero_pedido?: string | null
  cliente_razon_social?: string | null
  numero_remision?: string | null
  motivo?: string | null
  usuario_nombre?: string | null
  created_at: string
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

  listarEntradasDetalle: (params: {
    fecha_inicio: string
    fecha_fin: string
    skip?: number
    limit?: number
  }) =>
    api
      .get<MovimientoEntradaDetalle[]>('/inventario/movimientos/entradas/detalle', {
        params,
      })
      .then((r) => r.data),

  listarReporteMovimientos: (params: {
    fecha_inicio: string
    fecha_fin: string
    producto_id?: number
    skip?: number
    limit?: number
  }) =>
    api
      .get<MovimientoInventarioReporteDetalle[]>('/inventario/movimientos/reporte', {
        params,
      })
      .then((r) => r.data),

  corregirMovimiento: (movimientoId: number, data: { nuevo_producto_id: number; nueva_cantidad: number }) =>
    api.patch<MovimientoInventario>(`/inventario/movimientos/${movimientoId}/corregir`, data).then((r) => r.data),

  registrarMovimiento: (data: MovimientoInventarioCreate) =>
    api.post<MovimientoInventario>('/inventario/movimientos', data).then((r) => r.data),
}
