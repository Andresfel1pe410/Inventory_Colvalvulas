import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { remisionService } from '../services/remision.service'
import { ordenEmpaqueService } from '@/modules/orden-empaque/services/ordenEmpaque.service'
import { pedidoService } from '@/modules/pedidos/services/pedido.service'
import type { OrdenEmpaqueConDetalles } from '@/modules/orden-empaque/types/ordenEmpaque.types'

export function RemisionFormPage() {
  const navigate = useNavigate()
  const [ordenesCerradas, setOrdenesCerradas] = useState<OrdenEmpaqueConDetalles[]>([])
  const [ordenId, setOrdenId] = useState<number | ''>('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ordenEmpaqueService
      .list({ limit: 100 })
      .then((list) =>
        Promise.all(
          list.filter((o) => o.estado === 'cerrada').map((o) => ordenEmpaqueService.get(o.id))
        )
      )
      .then(setOrdenesCerradas)
      .catch(() => setOrdenesCerradas([]))
  }, [])

  const ordenSeleccionada = ordenId ? ordenesCerradas.find((o) => o.id === Number(ordenId)) : null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ordenSeleccionada) {
      setError('Seleccione una orden de empaque cerrada')
      return
    }
    setError('')
    setLoading(true)
    try {
      const pedido = await pedidoService.get(ordenSeleccionada.pedido_id)
      await remisionService.create({
        orden_empaque_id: ordenSeleccionada.id,
        cliente_id: pedido.cliente_id,
        detalles: ordenSeleccionada.detalles.map((d) => ({
          producto_id: d.producto_id,
          cantidad: d.cantidad,
        })),
      })
      navigate('/remisiones')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear remisión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nueva remisión</h1>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Orden de empaque (cerrada)
          </label>
          <select
            value={ordenId}
            onChange={(e) => setOrdenId(e.target.value ? Number(e.target.value) : '')}
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Seleccione...</option>
            {ordenesCerradas.map((o) => (
              <option key={o.id} value={o.id}>
                {o.numero_orden} - Pedido #{o.pedido_id}
              </option>
            ))}
          </select>
        </div>
        {ordenesCerradas.length === 0 && !loading && (
          <p className="text-sm text-slate-500">
            No hay órdenes de empaque cerradas. Cierre una orden primero.
          </p>
        )}
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading || ordenesCerradas.length === 0}
            className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear remisión'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/remisiones')}
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
