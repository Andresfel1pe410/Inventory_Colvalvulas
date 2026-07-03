import { useState } from 'react'
import { inventarioService, type MovimientoInventarioReporteDetalle } from '../services/inventario.service'
import { DataTable, type Column } from '@/shared/components'

interface ReporteMovimientosModalProps {
  open: boolean
  onClose: () => void
}

function getDefaultDates(): { inicio: string; fin: string } {
  const hoy = new Date()
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fin: hoy.toISOString().slice(0, 10),
  }
}

function formatFechaHora(value: string) {
  return new Date(value).toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function formatMovimiento(movimiento: MovimientoInventarioReporteDetalle) {
  const prefijo = movimiento.tipo === 'salida' ? '-' : '+'
  return `${prefijo}${movimiento.cantidad}`
}

function formatMotivo(movimiento: MovimientoInventarioReporteDetalle) {
  const esDevolucion = (movimiento.motivo || '').toLowerCase().includes('reversión') ||
    (movimiento.motivo || '').toLowerCase().includes('devolucion')

  if (movimiento.numero_pedido) {
    const cliente = movimiento.cliente_razon_social?.trim()
    const base = cliente
      ? `${movimiento.numero_pedido} | ${cliente}`
      : `${movimiento.numero_pedido} | Sin cliente`
    return esDevolucion ? `Devolución | ${base}` : base
  }
  return esDevolucion ? 'Devolución' : (movimiento.motivo || '—')
}

export function ReporteMovimientosModal({ open, onClose }: ReporteMovimientosModalProps) {
  const [fechaInicio, setFechaInicio] = useState(getDefaultDates().inicio)
  const [fechaFin, setFechaFin] = useState(getDefaultDates().fin)
  const [loading, setLoading] = useState(false)
  const [movimientos, setMovimientos] = useState<MovimientoInventarioReporteDetalle[]>([])
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const cargarReporte = async () => {
    if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) return
    setError('')
    setLoading(true)
    setHasSearched(true)
    try {
      const data = await inventarioService.listarReporteMovimientos({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      })
      setMovimientos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerar = () => {
    if (!fechaInicio || !fechaFin) {
      setError('Seleccione ambas fechas')
      return
    }
    if (fechaInicio > fechaFin) {
      setError('La fecha de inicio debe ser menor o igual a la fecha fin')
      return
    }
    cargarReporte()
  }

  const columns: Column<MovimientoInventarioReporteDetalle>[] = [
    {
      key: 'created_at',
      header: 'Fecha',
      render: (m) => <span className="text-sm text-slate-600">{formatFechaHora(m.created_at)}</span>,
    },
    {
      key: 'tipo',
      header: 'Movimiento',
      render: (m) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            m.tipo === 'salida'
              ? 'bg-red-100 text-red-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {m.tipo === 'salida' ? 'Salida' : 'Entrada'}
        </span>
      ),
    },
    {
      key: 'producto_referencia',
      header: 'Producto',
      render: (m) => (
        <div className="min-w-0">
          <div className="font-medium text-slate-900">{m.producto_referencia}</div>
          {m.producto_material ? <div className="text-xs text-slate-500">{m.producto_material}</div> : null}
        </div>
      ),
    },
    {
      key: 'cantidad',
      header: 'Cantidad',
      render: (m) => (
        <span className={`font-semibold ${m.tipo === 'salida' ? 'text-red-700' : 'text-emerald-700'}`}>
          {formatMovimiento(m)}
        </span>
      ),
    },
    {
      key: 'stock_anterior',
      header: 'Stock antes',
      render: (m) => <span className="text-sm text-slate-700">{m.stock_anterior}</span>,
    },
    {
      key: 'stock_nuevo',
      header: 'Stock actual',
      render: (m) => <span className="text-sm font-medium text-slate-900">{m.stock_nuevo}</span>,
    },
    {
      key: 'motivo',
      header: 'Motivo',
      render: (m) => <span className="text-sm text-slate-600">{formatMotivo(m)}</span>,
    },
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Reporte de entradas y salidas</h2>
              <p className="mt-1 text-sm text-slate-500">Se muestran movimientos con stock antes, stock actual y pedido asociado.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Fecha inicio</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Fecha fin</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="mt-1 rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerar}
              disabled={loading}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Generando...' : 'Generar reporte'}
            </button>
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {movimientos.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-slate-600">
                {movimientos.length} movimiento{movimientos.length !== 1 ? 's' : ''} en el período.
              </p>
              <DataTable
                columns={columns}
                data={movimientos}
                keyExtractor={(m) => `${m.id}-${m.created_at}`}
                emptyMessage="No hay movimientos"
              />
            </div>
          )}

          {!loading && hasSearched && movimientos.length === 0 && (
            <p className="text-sm text-slate-500">No se encontraron movimientos en el período seleccionado.</p>
          )}
          {!loading && !hasSearched && (
            <p className="text-sm text-slate-500">
              Seleccione las fechas de inicio y fin, luego haga clic en &quot;Generar reporte&quot;.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
