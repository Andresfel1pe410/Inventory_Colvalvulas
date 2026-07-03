import { useState } from 'react'
import {
  inventarioService,
  type MovimientoEntradaDetalle,
} from '../services/inventario.service'
import { useProductosList } from '@/modules/productos/hooks/useProductos'
import { ProductoSearchSelect } from '@/shared/components'
import { getCodigoDisplay } from '@/modules/productos/types/producto.types'
import { DataTable, Column } from '@/shared/components'

interface ReporteEntradasModalProps {
  open: boolean
  onClose: () => void
}

const PencilIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
)

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
  const [entradas, setEntradas] = useState<MovimientoEntradaDetalle[]>([])
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [editCantidadMov, setEditCantidadMov] = useState<MovimientoEntradaDetalle | null>(null)
  const [editProductoMov, setEditProductoMov] = useState<MovimientoEntradaDetalle | null>(null)
  const [editCantidadVal, setEditCantidadVal] = useState('')
  const [editProductoId, setEditProductoId] = useState<number | ''>('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const { data: productos = [] } = useProductosList({ limit: 500 })
  const productosOrdenados = [...productos].sort((a, b) =>
    (a.referencia || '').localeCompare(b.referencia || '', 'es')
  )

  const cargarEntradas = async () => {
    if (!fechaInicio || !fechaFin || fechaInicio > fechaFin) return
    setError('')
    setLoading(true)
    setHasSearched(true)
    try {
      const data = await inventarioService.listarEntradasDetalle({
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

  const handleGenerar = () => {
    if (!fechaInicio || !fechaFin) {
      setError('Seleccione ambas fechas')
      return
    }
    if (fechaInicio > fechaFin) {
      setError('La fecha de inicio debe ser menor o igual a la fecha fin')
      return
    }
    cargarEntradas()
  }

  const abrirEditarCantidad = (m: MovimientoEntradaDetalle) => {
    setEditCantidadMov(m)
    setEditCantidadVal(String(m.cantidad))
    setEditError('')
  }

  const abrirEditarProducto = (m: MovimientoEntradaDetalle) => {
    setEditProductoMov(m)
    setEditProductoId(m.producto_id)
    setEditError('')
  }

  const guardarCantidad = async () => {
    if (!editCantidadMov) return
    const qty = parseInt(editCantidadVal, 10)
    if (isNaN(qty) || qty === 0) {
      setEditError('La cantidad no puede ser cero')
      return
    }
    setEditLoading(true)
    setEditError('')
    try {
      await inventarioService.corregirMovimiento(editCantidadMov.id, {
        nuevo_producto_id: editCantidadMov.producto_id,
        nueva_cantidad: qty,
      })
      setEditCantidadMov(null)
      cargarEntradas()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al corregir')
    } finally {
      setEditLoading(false)
    }
  }

  const guardarProducto = async () => {
    if (!editProductoMov || !editProductoId) return
    setEditLoading(true)
    setEditError('')
    try {
      await inventarioService.corregirMovimiento(editProductoMov.id, {
        nuevo_producto_id: editProductoId,
        nueva_cantidad: editProductoMov.cantidad,
      })
      setEditProductoMov(null)
      cargarEntradas()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Error al corregir')
    } finally {
      setEditLoading(false)
    }
  }

  const columns: Column<MovimientoEntradaDetalle>[] = [
    {
      key: 'producto_referencia',
      header: 'Producto',
      render: (m) => (
        <span className="inline-flex items-center gap-1">
          {m.producto_referencia}
          {m.producto_material ? ` (${m.producto_material})` : ''}
          <button
            type="button"
            onClick={() => abrirEditarProducto(m)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
            title="Editar producto"
          >
            <PencilIcon />
          </button>
        </span>
      ),
    },
    {
      key: 'cantidad',
      header: 'Cantidad',
      render: (m) => (
        <span className="inline-flex items-center gap-1 font-medium">
          {m.cantidad}
          <button
            type="button"
            onClick={() => abrirEditarCantidad(m)}
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-primary-600"
            title="Editar cantidad"
          >
            <PencilIcon />
          </button>
        </span>
      ),
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
                {entradas.length} entrada{entradas.length !== 1 ? 's' : ''} en el período (use el lápiz para
                editar)
              </p>
              <DataTable
                columns={columns}
                data={entradas}
                keyExtractor={(m) => `${m.id}-${m.created_at}`}
                emptyMessage="No hay entradas"
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

      {/* Modal editar cantidad */}
      {editCantidadMov && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Editar cantidad</h3>
            <p className="mt-1 text-sm text-slate-500">
              {editCantidadMov.producto_referencia}
              {editCantidadMov.producto_material ? ` (${editCantidadMov.producto_material})` : ''}
            </p>
            {editError && (
              <div className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{editError}</div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Nueva cantidad</label>
              <input
                type="text"
                inputMode="text"
                pattern="-?[0-9]*"
                value={editCantidadVal}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === '' || value === '-' || /^-?\d*$/.test(value)) {
                    setEditCantidadVal(value)
                  }
                }}
                placeholder="Puede ser negativo"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditCantidadMov(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarCantidad}
                disabled={editLoading}
                className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {editLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar producto */}
      {editProductoMov && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Editar producto</h3>
            <p className="mt-1 text-sm text-slate-500">Cantidad actual: {editProductoMov.cantidad}</p>
            {editError && (
              <div className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">{editError}</div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">Nuevo producto</label>
              <ProductoSearchSelect
                value={editProductoId}
                onChange={setEditProductoId}
                products={productosOrdenados}
                formatLabel={(p) =>
                  p.material
                    ? `${p.referencia || getCodigoDisplay(p)} [${p.material}]`
                    : p.referencia || getCodigoDisplay(p) || `#${p.id}`
                }
                placeholder="Buscar producto..."
                className="mt-1"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditProductoMov(null)}
                className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarProducto}
                disabled={editLoading || !editProductoId}
                className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {editLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
