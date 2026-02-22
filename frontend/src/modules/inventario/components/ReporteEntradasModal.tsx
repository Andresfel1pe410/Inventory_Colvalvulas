import { useState } from 'react'
import { inventarioService, type MovimientoEntradaReporte } from '../services/inventario.service'
import { DataTable, Column } from '@/shared/components'

interface ReporteEntradasModalProps {
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

export function ReporteEntradasModal({ open, onClose }: ReporteEntradasModalProps) {
  const [fechaInicio, setFechaInicio] = useState(getDefaultDates().inicio)
  const [fechaFin, setFechaFin] = useState(getDefaultDates().fin)
  const [loading, setLoading] = useState(false)
  const [entradas, setEntradas] = useState<MovimientoEntradaReporte[]>([])
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const handleGenerar = async () => {
    if (!fechaInicio || !fechaFin) {
      setError('Seleccione ambas fechas')
      return
    }
    if (fechaInicio > fechaFin) {
      setError('La fecha de inicio debe ser menor o igual a la fecha fin')
      return
    }
    setError('')
    setLoading(true)
    setEntradas([])
    setHasSearched(true)
    try {
      const data = await inventarioService.listarEntradas({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      })
      setEntradas(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el reporte')
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<MovimientoEntradaReporte>[] = [
    {
      key: 'producto_referencia',
      header: 'Producto',
      render: (m) => (
        <span>
          {m.producto_referencia}
          {m.producto_material ? ` (${m.producto_material})` : ''}
        </span>
      ),
    },
    {
      key: 'cantidad_total',
      header: 'Cantidad total',
      render: (m) => <span className="font-medium">{m.cantidad_total}</span>,
    },
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Reporte de entradas</h2>
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

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {entradas.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-slate-600">
                {entradas.length} producto{entradas.length !== 1 ? 's' : ''} con entradas en el período
              </p>
              <DataTable
                columns={columns}
                data={entradas}
                keyExtractor={(m) => m.producto_id}
                emptyMessage="No hay productos con entradas"
              />
            </div>
          )}

          {!loading && hasSearched && entradas.length === 0 && (
            <p className="text-sm text-slate-500">
              No se encontraron entradas en el período seleccionado.
            </p>
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
