import { useState, useEffect } from 'react'
import { pedidoService } from '@/modules/pedidos/services/pedido.service'
import { ordenEmpaqueService } from '../services/ordenEmpaque.service'
import type { Pedido } from '@/modules/pedidos/types/pedido.types'

interface CrearOrdenModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CrearOrdenModal({ open, onClose, onCreated }: CrearOrdenModalProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [pedidoId, setPedidoId] = useState<number | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      pedidoService
        .list({ limit: 100 })
        .then((list) => setPedidos(list.filter((p) => p.estado !== 'despachado' && p.estado !== 'cancelado')))
        .catch(() => setPedidos([]))
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pedidoId) return
    setError('')
    setLoading(true)
    try {
      const pedido = await pedidoService.get(Number(pedidoId))
      await ordenEmpaqueService.create({
        pedido_id: pedido.id,
        detalles: pedido.detalles.map((d) => ({
          producto_id: d.producto_id,
          cantidad: d.cantidad,
        })),
      })
      onCreated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear orden')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Nueva orden de empaque</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700">Pedido</label>
            <select
              value={pedidoId}
              onChange={(e) => setPedidoId(e.target.value ? Number(e.target.value) : '')}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Seleccione...</option>
              {pedidos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero_pedido} - {p.estado}
                </option>
              ))}
            </select>
          </div>
          {pedidos.length === 0 && (
            <p className="text-sm text-slate-500">No hay pedidos disponibles</p>
          )}
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
              disabled={loading || pedidos.length === 0}
              className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
