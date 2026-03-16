import { api } from '@/shared/services/api'

export interface VentasVendedoresResponse {
  year: number
  month: number
  days: number[]
  series: { key: string; label: string; values: number[] }[]
  vendedores: { usuario_id: number; nombre: string; total_mes: number }[]
  total_mes: number
  top_clientes: { cliente_id: number; nombre: string; total_mes: number }[]
  top_productos: { producto_id: number; referencia: string; material: string; cantidad: number }[]
  avg_dias_envio: number | null
}

export interface TopClientesProductosAcumuladoResponse {
  year: number
  months: number[]
  top_clientes: { cliente_id: number; nombre: string; total: number }[]
  top_productos: { producto_id: number; referencia: string; material: string; cantidad: number }[]
}

export const reportesService = {
  ventasVendedores: (params?: { year?: number; month?: number }) =>
    api
      .get<VentasVendedoresResponse>('/reportes/ventas-vendedores', { params })
      .then((r) => r.data),

  topClientesProductosAcumulado: (params: { year: number; months: number[] }) =>
    api
      .get<TopClientesProductosAcumuladoResponse>('/reportes/top-clientes-productos', {
        params: { year: params.year, months: params.months.join(',') },
      })
      .then((r) => r.data),

  topClientesProductosAcumuladoCompleto: (params: { year: number; months: number[] }) =>
    api
      .get<TopClientesProductosAcumuladoResponse>('/reportes/top-clientes-productos', {
        params: { year: params.year, months: params.months.join(','), limit: 0 },
      })
      .then((r) => r.data),
}

