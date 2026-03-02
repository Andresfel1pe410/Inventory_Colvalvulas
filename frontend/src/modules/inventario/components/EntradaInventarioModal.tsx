import { useState, useEffect, useMemo } from 'react'
import { useProductosList } from '@/modules/productos/hooks/useProductos'
import { useInventarioList } from '../hooks/useInventario'
import { ProductoSearchSelect } from '@/shared/components'
import { getCodigoDisplay } from '@/modules/productos/types/producto.types'
import { useInventarioRegistrarMovimiento } from '../hooks/useInventario'

interface EntradaInventarioModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function EntradaInventarioModal({ open, onClose, onCreated }: EntradaInventarioModalProps) {
  const [productoId, setProductoId] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  const { data: productos = [] } = useProductosList({
    limit: 500,
  })
  const { data: invData = [] } = useInventarioList({ limit: 500 })
  const registrarMutation = useInventarioRegistrarMovimiento()

  const stockMap = useMemo(() => {
    const map: Record<number, number> = {}
    invData.forEach((i) => {
      map[i.producto_id] = i.stock_actual
    })
    return map
  }, [invData])

  const productosOrdenados = useMemo(
    () =>
      [...productos].sort((a, b) => {
        const refA = (a.referencia || '').toLowerCase()
        const refB = (b.referencia || '').toLowerCase()
        const cmp = refA.localeCompare(refB, 'es')
        if (cmp !== 0) return cmp
        return (a.material || '').localeCompare(b.material || '', 'es')
      }),
    [productos]
  )

  const stockActual = productoId ? stockMap[productoId] ?? 0 : null

  useEffect(() => {
    if (open) {
      setProductoId('')
      setCantidad('')
      setMotivo('')
      setError('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = parseInt(cantidad, 10)
    if (!productoId || cantidad === '' || isNaN(qty) || qty === 0) return
    setError('')
    try {
      await registrarMutation.mutateAsync({
        producto_id: Number(productoId),
        tipo: 'entrada',
        cantidad: qty,
        motivo: motivo.trim() || undefined,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar entrada')
    }
  }

  const loading = registrarMutation.isPending

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Agregar entrada de inventario</h3>
        <p className="mt-1 text-sm text-slate-500">
          Registra el stock que llega de proveedores o producción. Use negativo para correcciones.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Producto</label>
            <ProductoSearchSelect
              value={productoId}
              onChange={setProductoId}
              products={productosOrdenados}
              formatLabel={(p) => {
                const base = p.material ? `${p.referencia || getCodigoDisplay(p)} [${p.material}]` : (p.referencia || getCodigoDisplay(p) || `#${p.id}`)
                return `${base} (stock: ${stockMap[p.id] ?? 0})`
              }}
              placeholder="Buscar por referencia, código o material..."
              className="mt-1"
            />
            {stockActual !== null && (
              <p className="mt-1 text-xs text-slate-500">Stock actual: {stockActual}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Cantidad</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
              placeholder="Ej: 50 o -10 para corrección"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Motivo (opcional)</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Recepción de proveedor, Producción..."
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || productos.length === 0}
              className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
