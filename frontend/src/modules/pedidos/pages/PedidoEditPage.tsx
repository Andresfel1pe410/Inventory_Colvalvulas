import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { formatPesos } from '@/shared/utils/format'
import { ClienteSearchSelect, ProductoSearchSelect } from '@/shared/components'
import { pedidoService } from '../services/pedido.service'
import { productoService } from '@/modules/productos/services/producto.service'
import { getPrecioByLista, getCodigoByLista, tieneLista, LISTAS_PRECIOS, LISTA_LABELS } from '@/modules/productos/types/producto.types'
import type { Producto } from '@/modules/productos/types/producto.types'
import { useAuthStore } from '@/modules/auth'

interface LineaDetalle {
  producto_id: number
  producto?: Producto
  cantidad: number | ''
}

export function PedidoEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const listasDisponibles =
    user?.listas_precio && user.listas_precio.length > 0
      ? user.listas_precio
      : [...LISTAS_PRECIOS]

  const [productos, setProductos] = useState<Producto[]>([])
  const [clienteId, setClienteId] = useState<number | ''>('')
  const [observaciones, setObservaciones] = useState('')
  const [listaPrecios, setListaPrecios] = useState<string>('lista_1')
  const [descuento, setDescuento] = useState<number | ''>(0)
  const [detalles, setDetalles] = useState<LineaDetalle[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingPedido, setLoadingPedido] = useState(true)
  const [noEditable, setNoEditable] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoadingPedido(true)
    Promise.all([
      productoService.list({ limit: 500 }),
      pedidoService.get(Number(id)),
    ])
      .then(([p, ped]) => {
        setProductos(p)
        if (ped.estado === 'enviado' || ped.estado === 'cancelado') {
          setNoEditable(true)
          return
        }
        setClienteId(ped.cliente_id)
        setObservaciones(ped.observaciones || '')
        const pedLista = ped.lista_precios || 'lista_1'
        setListaPrecios(
          listasDisponibles.includes(pedLista) ? pedLista : listasDisponibles[0] || 'lista_1'
        )
        setDescuento(ped.descuento ?? 0)
        setDetalles(
          ped.detalles.map((d) => ({
            producto_id: d.producto_id,
            producto: p.find((pr) => pr.id === d.producto_id),
            cantidad: d.cantidad,
          }))
        )
      })
      .catch(() => {
        setError('Pedido no encontrado')
        setProductos([])
      })
      .finally(() => setLoadingPedido(false))
  }, [id])

  const productosLista = productos
    .filter(
      (p) =>
        tieneLista(p, listaPrecios) ||
        !p.listas_precio?.length ||
        detalles.some((d) => d.producto_id === p.id)
    )
    .sort((a, b) => (a.referencia || '').localeCompare(b.referencia || '', 'es'))
  const addLinea = () => {
    const disponibles = productosLista
    if (disponibles.length === 0) return
    setDetalles((d) => [...d, { producto_id: disponibles[0].id, cantidad: 1, producto: disponibles[0] }])
  }

  const updateLinea = (idx: number, field: 'producto_id' | 'cantidad', value: number | '') => {
    setDetalles((d) => {
      const copy = [...d]
      if (field === 'producto_id') {
        const prod = productos.find((p) => p.id === (value as number))
        copy[idx] = { ...copy[idx], producto_id: value as number, producto: prod }
      } else {
        copy[idx] = { ...copy[idx], cantidad: value }
      }
      return copy
    })
  }

  const removeLinea = (idx: number) => {
    setDetalles((d) => d.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !clienteId || detalles.length === 0) {
      setError('Seleccione cliente y agregue al menos un producto')
      return
    }
    const cantidadesInvalidas = detalles.some(
      (d) => d.cantidad === '' || (typeof d.cantidad === 'number' && d.cantidad < 1)
    )
    if (cantidadesInvalidas) {
      setError('Cada línea debe tener una cantidad válida (mínimo 1)')
      return
    }
    setError('')
    setLoading(true)
    try {
      const payload = {
        cliente_id: Number(clienteId),
        observaciones: observaciones || undefined,
        lista_precios: listaPrecios,
        descuento: typeof descuento === 'number' ? descuento : (parseFloat(String(descuento)) || 0),
        detalles: detalles.map((d) => {
          const prod = productos.find((p) => p.id === d.producto_id)
          const cant =
            typeof d.cantidad === 'number' ? d.cantidad : parseInt(String(d.cantidad), 10) || 1
          return {
            producto_id: d.producto_id,
            cantidad: cant,
            precio_unitario: prod ? getPrecioByLista(prod, listaPrecios) : undefined,
          }
        }),
      }
      await pedidoService.update(Number(id), payload)
      navigate(`/pedidos/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  if (loadingPedido) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
        Cargando pedido...
      </div>
    )
  }

  if (noEditable) {
    return (
      <div>
        <div className="rounded-md bg-amber-50 p-4 text-amber-800">
          Este pedido no se puede editar porque ya está enviado o cancelado.
        </div>
        <button
          type="button"
          onClick={() => navigate(`/pedidos/${id}`)}
          className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
        >
          Volver al pedido
        </button>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Editar pedido</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Cliente</label>
              <ClienteSearchSelect
                value={clienteId}
                onChange={setClienteId}
                placeholder="Buscar por nombre o NIT..."
                required
                disabled={noEditable}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Lista de precios</label>
              <select
                value={listaPrecios}
                onChange={(e) => setListaPrecios(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              >
                {listasDisponibles.map((l) => (
                  <option key={l} value={l}>
                    {LISTA_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Descuento (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={descuento === '' ? '' : descuento}
                onChange={(e) => {
                  const v = e.target.value
                  setDescuento(v === '' ? '' : (parseFloat(v) || 0))
                }}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Observaciones</label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-slate-900">Detalle del pedido</h2>
            <button
              type="button"
              onClick={addLinea}
              className="rounded-md bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
            >
              Agregar línea
            </button>
          </div>
          {detalles.length === 0 ? (
            <p className="text-sm text-slate-500">Agregue productos al pedido</p>
          ) : (
            <div className="space-y-2 overflow-x-auto">
              <div className="grid min-w-[640px] grid-cols-[1fr_100px_80px_100px_100px_120px_auto] gap-4 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                <span>Producto</span>
                <span>Código</span>
                <span>Cant.</span>
                <span className="text-right">Precio unit.</span>
                <span className="text-right">Subtotal</span>
                <span />
              </div>
              {detalles.map((d, idx) => {
                const prod = d.producto || productos.find((p) => p.id === d.producto_id)
                const codigo = prod ? getCodigoByLista(prod, listaPrecios) || '—' : '—'
                const precioUnit = prod ? getPrecioByLista(prod, listaPrecios) : 0
                const cant = typeof d.cantidad === 'number' ? d.cantidad : parseInt(String(d.cantidad), 10) || 0
                const subtotal = precioUnit * cant
                return (
                  <div
                    key={idx}
                    className="grid min-w-[640px] grid-cols-[1fr_100px_80px_100px_100px_120px_auto] items-center gap-4 rounded border p-2"
                  >
                    <div className="min-w-0">
                      <ProductoSearchSelect
                        value={d.producto_id}
                        onChange={(id) => updateLinea(idx, 'producto_id', id === '' ? '' : id)}
                        products={productosLista}
                        formatLabel={(p) => p.referencia}
                        placeholder="Buscar por referencia, código o material..."
                        disabled={noEditable}
                      />
                    </div>
                    <span className="text-sm text-slate-600">{codigo}</span>
                    <input
                      type="number"
                      min="1"
                      value={d.cantidad === '' ? '' : d.cantidad}
                      onChange={(e) => {
                        const v = e.target.value
                        updateLinea(idx, 'cantidad', v === '' ? '' : (parseInt(v, 10) || 0))
                      }}
                      className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                    />
                    <span className="text-right text-sm text-slate-700">{formatPesos(precioUnit)}</span>
                    <span className="text-right text-sm font-medium text-slate-800">{formatPesos(subtotal)}</span>
                    <button
                      type="button"
                      onClick={() => removeLinea(idx)}
                      className="text-red-600 hover:underline"
                    >
                      Quitar
                    </button>
                  </div>
                )
              })}
              <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
                <div className="space-y-1 text-right">
                  <p className="text-sm text-slate-600">
                    Subtotal:{' '}
                    <span className="font-medium">
                      {formatPesos(
                        detalles.reduce((s, d) => {
                          const prod = d.producto || productos.find((p) => p.id === d.producto_id)
                          const precio = prod ? getPrecioByLista(prod, listaPrecios) : 0
                          const cant =
                            typeof d.cantidad === 'number' ? d.cantidad : parseInt(String(d.cantidad), 10) || 0
                          return s + precio * cant
                        }, 0)
                      )}
                    </span>
                  </p>
                  {(typeof descuento === 'number' ? descuento : parseFloat(String(descuento)) || 0) > 0 && (
                    <p className="text-sm text-slate-600">
                      Descuento {descuento}%:{' '}
                      <span className="font-medium text-green-600">
                        -
                        {formatPesos(
                          detalles.reduce((s, d) => {
                            const prod = d.producto || productos.find((p) => p.id === d.producto_id)
                            const precio = prod ? getPrecioByLista(prod, listaPrecios) : 0
                            const cant =
                              typeof d.cantidad === 'number' ? d.cantidad : parseInt(String(d.cantidad), 10) || 0
                            return s + precio * cant
                          }, 0) *
                            ((typeof descuento === 'number' ? descuento : parseFloat(String(descuento)) || 0) / 100)
                        )}
                      </span>
                    </p>
                  )}
                  <p className="text-base font-semibold text-slate-900">
                    Total:{' '}
                    {formatPesos(
                      detalles.reduce((s, d) => {
                        const prod = d.producto || productos.find((p) => p.id === d.producto_id)
                        const precio = prod ? getPrecioByLista(prod, listaPrecios) : 0
                        const cant =
                          typeof d.cantidad === 'number' ? d.cantidad : parseInt(String(d.cantidad), 10) || 0
                        return s + precio * cant
                      }, 0) *
                        (1 - ((typeof descuento === 'number' ? descuento : parseFloat(String(descuento)) || 0) / 100))
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/pedidos/${id}`)}
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
