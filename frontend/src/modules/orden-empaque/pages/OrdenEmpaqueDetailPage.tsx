import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ordenEmpaqueService } from '../services/ordenEmpaque.service'
import { productoService } from '@/modules/productos/services/producto.service'
import type { OrdenEmpaqueConDetalles } from '../types/ordenEmpaque.types'
import { getCodigoDisplay } from '@/modules/productos/types/producto.types'
import type { Producto } from '@/modules/productos/types/producto.types'
import { ConfirmDialog } from '@/shared/components'

export function OrdenEmpaqueDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orden, setOrden] = useState<OrdenEmpaqueConDetalles | null>(null)
  const [productos, setProductos] = useState<Record<number, Producto>>({})
  const [loading, setLoading] = useState(true)
  const [cerrando, setCerrando] = useState(false)
  const [confirmCerrar, setConfirmCerrar] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [o, pList] = await Promise.all([
        ordenEmpaqueService.get(Number(id)),
        productoService.list({ limit: 500 }),
      ])
      setOrden(o)
      setProductos(Object.fromEntries(pList.map((p) => [p.id, p])))
    } catch {
      setOrden(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const handleCerrar = async () => {
    if (!id) return
    setCerrando(true)
    try {
      await ordenEmpaqueService.cerrar(Number(id))
      setConfirmCerrar(false)
      load()
    } catch {
      setConfirmCerrar(false)
    } finally {
      setCerrando(false)
    }
  }

  if (loading || !orden) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
        Cargando...
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          Orden {orden.numero_orden}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/orden-empaque')}
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>
          {orden.estado !== 'cerrada' && (
            <button
              onClick={() => setConfirmCerrar(true)}
              className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
            >
              Cerrar orden
            </button>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          Estado: <span className="font-medium">{orden.estado}</span> | Pedido: #{orden.pedido_id}
        </p>
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3 font-medium text-slate-900">
          Detalle
        </div>
        <div className="divide-y divide-slate-200">
          {orden.detalles.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <span>{productos[d.producto_id]?.referencia || (productos[d.producto_id] && getCodigoDisplay(productos[d.producto_id])) || `Producto #${d.producto_id}`}</span>
              <span>
                {d.cantidad_empacada} / {d.cantidad}
              </span>
            </div>
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={confirmCerrar}
        title="Cerrar orden de empaque"
        message="Al cerrar se registrarán las salidas de inventario. ¿Continuar?"
        confirmLabel="Cerrar"
        loading={cerrando}
        onConfirm={handleCerrar}
        onCancel={() => setConfirmCerrar(false)}
      />
    </div>
  )
}
