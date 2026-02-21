import { useState, useEffect } from 'react'
import { inventarioService } from '../services/inventario.service'
import { productoService } from '@/modules/productos/services/producto.service'
import type { Inventario } from '../types/inventario.types'
import type { Producto } from '@/modules/productos/types/producto.types'

interface EntradaInventarioModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function EntradaInventarioModal({ open, onClose, onCreated }: EntradaInventarioModalProps) {
  const [inventarios, setInventarios] = useState<(Inventario & { producto?: Producto })[]>([])
  const [productoId, setProductoId] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setProductoId('')
      setCantidad('')
      setMotivo('')
      setError('')
      Promise.all([
        inventarioService.list({ limit: 500 }),
        productoService.list({ limit: 500, activos_only: false }),
      ])
        .then(([invData, prodData]) => {
          const prodMap = Object.fromEntries(prodData.map((p) => [p.id, p]))
          setInventarios(invData.map((i) => ({ ...i, producto: prodMap[i.producto_id] })))
        })
        .catch(() => setInventarios([]))
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productoId || !cantidad || parseInt(cantidad, 10) <= 0) return
    setError('')
    setLoading(true)
    try {
      await inventarioService.registrarMovimiento({
        producto_id: Number(productoId),
        tipo: 'entrada',
        cantidad: parseInt(cantidad, 10),
        motivo: motivo.trim() || undefined,
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar entrada')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const stockActual = inventarios.find((i) => i.producto_id === productoId)?.stock_actual ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Agregar entrada de inventario</h3>
        <p className="mt-1 text-sm text-slate-500">
          Registra el stock que llega de proveedores o producción
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Producto</label>
            <select
              value={productoId}
              onChange={(e) => setProductoId(e.target.value ? Number(e.target.value) : '')}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Seleccione producto...</option>
              {inventarios.map((i) => (
                <option key={i.id} value={i.producto_id}>
                  {i.producto?.referencia || i.producto?.codigo || `#${i.producto_id}`} (stock: {i.stock_actual})
                </option>
              ))}
            </select>
            {stockActual !== null && (
              <p className="mt-1 text-xs text-slate-500">Stock actual: {stockActual}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Cantidad</label>
            <input
              type="number"
              min="1"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
              placeholder="Ej: 50"
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
              disabled={loading || inventarios.length === 0}
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
