import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatPesos } from '@/shared/utils/format'
import { pedidoService } from '@/modules/pedidos/services/pedido.service'
import { clienteService } from '@/modules/clientes/services/cliente.service'
import { productoService } from '@/modules/productos/services/producto.service'
import { DataTable, Column } from '@/shared/components'
import type { Pedido, PedidoConDetalles, IntencionEnvio } from '@/modules/pedidos/types/pedido.types'
import type { Cliente } from '@/modules/clientes/types/cliente.types'
import { getCodigoDisplay } from '@/modules/productos/types/producto.types'
import type { Producto } from '@/modules/productos/types/producto.types'

const TRANSPORTADORAS = ['YP', 'A.N.', 'E.Express', 'Interrapidisimo'] as const

function diasSinEnviar(createdAt: string, estado: string): number | null {
  if (estado === 'enviado') return null
  const created = new Date(createdAt).getTime()
  const hoy = Date.now()
  return Math.floor((hoy - created) / (1000 * 60 * 60 * 24))
}

function colorDias(dias: number): string {
  if (dias <= 6) return 'bg-green-100 text-green-800'
  if (dias <= 10) return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function colorIntencion(intencion: IntencionEnvio | null | undefined): string {
  if (!intencion || intencion === 'enviar') return 'bg-green-100 text-green-800'
  if (intencion === 'enviar_parcial') return 'bg-amber-100 text-amber-800'
  return 'bg-red-100 text-red-800'
}

function labelIntencion(intencion: IntencionEnvio | null | undefined): string {
  if (!intencion || intencion === 'enviar') return 'Enviar'
  if (intencion === 'enviar_parcial') return 'Enviar Parcial'
  return 'No enviar'
}

export function ControlPedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Record<number, Cliente>>({})
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detail, setDetail] = useState<PedidoConDetalles | null>(null)
  const [productos, setProductos] = useState<Record<number, Producto>>({})
  const [envioModal, setEnvioModal] = useState(false)
  const [transportadora, setTransportadora] = useState('')
  const [numeroFactura, setNumeroFactura] = useState('')
  const [numeroGuia, setNumeroGuia] = useState('')
  const [checklistEnvio, setChecklistEnvio] = useState<
    Record<number, { estado: 'completo' | 'parcial' | 'no_enviado'; cantidad: number }>
  >({})
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [pedData, cliData, prodData] = await Promise.all([
        pedidoService.list({ limit: 500 }),
        clienteService.list({ limit: 500 }),
        productoService.list({ limit: 500 }),
      ])
      setPedidos(pedData)
      setClientes(Object.fromEntries(cliData.map((c) => [c.id, c])))
      setProductos(Object.fromEntries(prodData.map((p) => [p.id, p])))
    } catch {
      setPedidos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (detailId) {
      pedidoService
        .get(detailId)
        .then(setDetail)
        .catch(() => setDetail(null))
    } else {
      setDetail(null)
    }
  }, [detailId])

  const handleCambiarEstado = async (id: number, nuevoEstado: string) => {
    setError('')
    setActionLoading(true)
    try {
      await pedidoService.cambiarEstado(id, nuevoEstado)
      setDetailId(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar estado')
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnviar = async () => {
    if (!detailId || !transportadora || !detail) return
    setError('')
    setActionLoading(true)
    try {
      const detalles: { producto_id: number; cantidad_enviada: number }[] = []
      const lineasResumen: string[] = []

      for (const d of detail.detalles) {
        const item = checklistEnvio[d.producto_id] ?? {
          estado: 'completo' as const,
          cantidad: d.cantidad,
        }
        const qty = item.estado === 'no_enviado' ? 0 : item.cantidad
        const prodNombre = productos[d.producto_id]?.referencia || (productos[d.producto_id] && getCodigoDisplay(productos[d.producto_id])) || `Producto #${d.producto_id}`

        detalles.push({ producto_id: d.producto_id, cantidad_enviada: qty })

        if (item.estado === 'completo') {
          lineasResumen.push(`${prodNombre}: completo`)
        } else if (item.estado === 'parcial') {
          lineasResumen.push(`${prodNombre}: parcial (${qty} de ${d.cantidad})`)
        } else {
          lineasResumen.push(`${prodNombre}: no enviado`)
        }
      }

      await pedidoService.marcarEnviado(detailId, {
        transportadora,
        numero_factura: numeroFactura.trim() || undefined,
        numero_guia: numeroGuia.trim() || undefined,
        detalles,
        resumen_envio: lineasResumen.join('. '),
      })
      setEnvioModal(false)
      setTransportadora('')
      setNumeroFactura('')
      setNumeroGuia('')
      setChecklistEnvio({})
      setDetailId(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al marcar enviado')
    } finally {
      setActionLoading(false)
    }
  }

  const abrirEnvioModal = () => {
    setTransportadora('')
    setNumeroFactura('')
    setNumeroGuia('')
    setError('')
    if (detail?.detalles) {
      const init: Record<number, { estado: 'completo' | 'parcial' | 'no_enviado'; cantidad: number }> =
        {}
      for (const d of detail.detalles) {
        init[d.producto_id] = { estado: 'completo', cantidad: d.cantidad }
      }
      setChecklistEnvio(init)
    }
    setEnvioModal(true)
  }

  const setChecklistItem = (
    productoId: number,
    cantidadPedida: number,
    update: Partial<{ estado: 'completo' | 'parcial' | 'no_enviado'; cantidad: number }>
  ) => {
    setChecklistEnvio((prev) => {
      const curr = prev[productoId] ?? { estado: 'completo' as const, cantidad: cantidadPedida }
      const next = { ...curr, ...update }
      if (next.estado === 'completo') next.cantidad = cantidadPedida
      if (next.estado === 'no_enviado') next.cantidad = 0
      return { ...prev, [productoId]: next }
    })
  }

  const columns: Column<Pedido>[] = [
    {
      key: 'numero_pedido',
      header: 'Nº Pedido',
      render: (p) => (
        <span className="font-medium text-slate-900">{p.numero_pedido}</span>
      ),
    },
    {
      key: 'cliente_id',
      header: 'Cliente',
      render: (p) => clientes[p.cliente_id]?.razon_social || `#${p.cliente_id}`,
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (p) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            p.estado === 'enviado'
              ? 'bg-green-100 text-green-800'
              : p.estado === 'en_proceso'
                ? 'bg-amber-100 text-amber-800'
                : p.estado === 'cancelado'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-slate-100 text-slate-800'
          }`}
        >
          {p.estado.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'intencion_envio',
      header: 'Intención de envío',
      render: (p) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorIntencion(
            p.intencion_envio ?? undefined
          )}`}
        >
          {labelIntencion(p.intencion_envio ?? undefined)}
        </span>
      ),
    },
    {
      key: 'dias_sin_enviar',
      header: 'Días sin enviar',
      render: (p) => {
        const dias = diasSinEnviar(p.created_at, p.estado)
        if (dias === null) return <span className="text-slate-400">—</span>
        return (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorDias(dias)}`}
          >
            {dias}
          </span>
        )
      },
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      render: (p) => (
        <button
          type="button"
          onClick={() => setDetailId(p.id)}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          title="Ver detalles"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Control Pedidos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestiona el estado de los pedidos: En espera → En proceso → Enviado
        </p>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Cargando...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={pedidos}
          keyExtractor={(p) => p.id}
          emptyMessage="No hay pedidos"
        />
      )}

      {/* Modal detalle */}
      {detailId && detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="sticky top-0 border-b border-slate-200 bg-white px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  Pedido {detail.numero_pedido}
                </h2>
                <button
                  type="button"
                  onClick={() => setDetailId(null)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="space-y-4 p-6">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Cliente</p>
                  <p className="font-medium">{clientes[detail.cliente_id]?.razon_social}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Estado</p>
                  <p className="font-medium capitalize">{detail.estado.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-slate-500">Total</p>
                  <p className="font-medium">{formatPesos(detail.total)}</p>
                </div>
                {detail.lista_precios && (
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Lista</p>
                    <p className="font-medium capitalize">{detail.lista_precios.replace('_', ' ')}</p>
                  </div>
                )}
                {(detail.descuento ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-500">Descuento</p>
                    <p className="font-medium">{detail.descuento}%</p>
                  </div>
                )}
                {detail.observaciones && (
                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase text-slate-500">Observaciones</p>
                    <p className="text-sm">{detail.observaciones}</p>
                  </div>
                )}
              </div>

              {/* Resumen de envío (checklist) */}
              {detail.resumen_envio && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h3 className="mb-2 text-sm font-medium text-amber-900">Resumen de envío</h3>
                  <p className="whitespace-pre-wrap text-sm text-amber-800">
                    {detail.resumen_envio}
                  </p>
                </div>
              )}

              {/* Datos de envío (cuando está enviado) */}
              {detail.estado === 'enviado' && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h3 className="mb-3 font-medium text-slate-900">Datos de entrega</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Fecha envío</p>
                      <p className="text-sm font-medium">
                        {detail.fecha_envio
                          ? new Date(detail.fecha_envio).toLocaleString('es-CO')
                          : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Enviado por</p>
                      <p className="text-sm font-medium">
                        {(detail as PedidoConDetalles & { usuario_envio?: { nombre: string } })
                          ?.usuario_envio?.nombre || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Transportadora</p>
                      <p className="text-sm font-medium">{detail.transportadora || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Nº Factura</p>
                      <p className="text-sm font-medium">{detail.numero_factura || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Nº Guía</p>
                      <p className="text-sm font-medium">{detail.numero_guia || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-2 font-medium text-slate-900">Detalle del pedido</h3>
                <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                  {detail.detalles.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <span>{productos[d.producto_id]?.referencia || (productos[d.producto_id] && getCodigoDisplay(productos[d.producto_id])) || `#${d.producto_id}`}</span>
                      <span>
                        {d.cantidad} x {formatPesos(d.precio_unitario)} = {formatPesos(d.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de cambio de estado */}
              {detail.estado !== 'enviado' && detail.estado !== 'cancelado' && (
                <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                  <Link
                    to={`/pedidos/${detail.id}/editar`}
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Editar pedido
                  </Link>
                  {detail.estado === 'en_espera' && (
                    <button
                      type="button"
                      onClick={() => handleCambiarEstado(detail.id, 'en_proceso')}
                      disabled={actionLoading}
                      className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Marcar En proceso
                    </button>
                  )}
                  {detail.estado === 'en_proceso' && (
                    <>
                      <button
                        type="button"
                        onClick={abrirEnvioModal}
                        disabled={actionLoading}
                        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Marcar Enviado
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCambiarEstado(detail.id, 'en_espera')}
                        disabled={actionLoading}
                        className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Volver a En espera
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => handleCambiarEstado(detail.id, 'cancelado')}
                    disabled={actionLoading}
                    className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Cancelar pedido
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal enviar */}
      {envioModal && detailId && detail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Marcar como Enviado</h3>
            <p className="mt-1 text-sm text-slate-500">
              Indica la transportadora, factura, guía y el checklist de productos enviados
            </p>
            <div className="mt-4 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Transportadora *
                </label>
                <select
                  value={transportadora}
                  onChange={(e) => setTransportadora(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                >
                  <option value="">Seleccione...</option>
                  {TRANSPORTADORAS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nº Factura (opcional)
                </label>
                <input
                  type="text"
                  value={numeroFactura}
                  onChange={(e) => setNumeroFactura(e.target.value)}
                  placeholder="Ej: F-001234"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Nº Guía (opcional)
                </label>
                <input
                  type="text"
                  value={numeroGuia}
                  onChange={(e) => setNumeroGuia(e.target.value)}
                  placeholder="Ej: 1234567890"
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Checklist de productos
                </label>
                <div className="mt-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  {detail.detalles.map((d) => {
                    const item =
                      checklistEnvio[d.producto_id] ?? { estado: 'completo' as const, cantidad: d.cantidad }
                    const prodNombre = productos[d.producto_id]?.referencia || (productos[d.producto_id] && getCodigoDisplay(productos[d.producto_id])) || `#${d.producto_id}`
                    return (
                      <div
                        key={d.id}
                        className="flex flex-wrap items-center gap-2 rounded border border-slate-200 bg-white p-2"
                      >
                        <span className="min-w-0 flex-1 text-sm font-medium text-slate-800">
                          {prodNombre}
                        </span>
                        <span className="text-xs text-slate-500">({d.cantidad} pedidos)</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="radio"
                              name={`envio-${d.producto_id}`}
                              checked={item.estado === 'completo'}
                              onChange={() =>
                                setChecklistItem(d.producto_id, d.cantidad, { estado: 'completo' })
                              }
                              className="rounded border-slate-300"
                            />
                            Completo
                          </label>
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="radio"
                              name={`envio-${d.producto_id}`}
                              checked={item.estado === 'parcial'}
                              onChange={() =>
                                setChecklistItem(d.producto_id, d.cantidad, {
                                  estado: 'parcial',
                                  cantidad: Math.max(1, Math.min(item.cantidad, d.cantidad - 1)),
                                })
                              }
                              className="rounded border-slate-300"
                            />
                            Parcial
                          </label>
                          {item.estado === 'parcial' && (
                            <input
                              type="number"
                              min={1}
                              max={d.cantidad}
                              value={item.cantidad}
                              onChange={(e) =>
                                setChecklistItem(d.producto_id, d.cantidad, {
                                  cantidad: parseInt(e.target.value, 10) || 0,
                                })
                              }
                              className="w-16 rounded border border-slate-300 px-2 py-1 text-sm"
                            />
                          )}
                          <label className="flex items-center gap-1 text-sm">
                            <input
                              type="radio"
                              name={`envio-${d.producto_id}`}
                              checked={item.estado === 'no_enviado'}
                              onChange={() =>
                                setChecklistItem(d.producto_id, d.cantidad, {
                                  estado: 'no_enviado',
                                })
                              }
                              className="rounded border-slate-300"
                            />
                            No enviado
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEnvioModal(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleEnviar}
                  disabled={actionLoading || !transportadora}
                  className="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Enviando...' : 'Confirmar envío'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
