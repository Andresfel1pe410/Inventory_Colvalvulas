import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { PageLoading } from '@/shared/components'
import { formatPesos } from '@/shared/utils/format'
import { usePedido, usePedidoUpdateIntencionEnvio } from '../hooks/usePedidos'
import { useProductosList } from '@/modules/productos/hooks/useProductos'
import { useCliente } from '@/modules/clientes/hooks/useClientes'
import type { PedidoConDetalles, IntencionEnvio } from '../types/pedido.types'
import { getCodigoDisplay, getCodigoByLista } from '@/modules/productos/types/producto.types'

const OPCIONES_INTENCION: { value: IntencionEnvio | ''; label: string }[] = [
  { value: 'enviar', label: 'Enviar' },
  { value: 'enviar_parcial', label: 'Enviar Parcial' },
  { value: 'no_enviar', label: 'No enviar' },
]

function diasSinEnviar(createdAt: string, estado: string): number | null {
  if (estado === 'enviado') return null
  const created = new Date(createdAt).getTime()
  const hoy = Date.now()
  return Math.floor((hoy - created) / (1000 * 60 * 60 * 24))
}

function colorDias(dias: number): string {
  if (dias <= 6) return 'bg-green-100 border-green-400 text-green-800'
  if (dias <= 10) return 'bg-amber-100 border-amber-400 text-amber-800'
  return 'bg-red-100 border-red-400 text-red-800'
}

function colorIntencion(intencion: IntencionEnvio | null | undefined): string {
  if (!intencion) return 'bg-slate-100 border-slate-300 text-slate-700'
  if (intencion === 'enviar') return 'bg-green-100 border-green-400 text-green-800'
  if (intencion === 'enviar_parcial') return 'bg-amber-100 border-amber-400 text-amber-800'
  return 'bg-red-100 border-red-400 text-red-800'
}

function labelIntencion(intencion: IntencionEnvio | null | undefined): string {
  if (!intencion) return 'Sin definir'
  if (intencion === 'enviar') return 'Enviar'
  if (intencion === 'enviar_parcial') return 'Enviar Parcial'
  return 'No enviar'
}

export function PedidoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.roles?.includes('admin')

  const { data: pedido, isLoading } = usePedido(id ? Number(id) : null)
  const { data: productosData = [] } = useProductosList({ limit: 500 })
  const { data: cliente } = useCliente(pedido?.cliente_id ?? null)

  const productos = Object.fromEntries(productosData.map((p) => [p.id, p]))
  const intencionMutation = usePedidoUpdateIntencionEnvio()

  if (isLoading) {
    return <PageLoading />
  }

  if (!pedido) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
        Pedido no encontrado
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/pedidos')}
            className="text-primary-600 hover:underline"
          >
            Volver a pedidos
          </button>
        </div>
      </div>
    )
  }

  const handlePrint = () => window.print()

  const handleIntencionChange = async (value: IntencionEnvio | '') => {
    if (!pedido || intencionMutation.isPending) return
    const val = value === '' ? null : value
    try {
      await intencionMutation.mutateAsync({ id: pedido.id, intencion_envio: val })
    } catch {
      // Error manejado por interceptor
    }
  }

  return (
    <div>
      <div className="no-print mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">
          Pedido {pedido.numero_pedido}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir
          </button>
          {pedido.estado !== 'enviado' && pedido.estado !== 'cancelado' && (
            <>
              <Link
                to={`/pedidos/${pedido.id}/editar`}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Editar pedido
              </Link>
              <Link
                to="/control-pedidos"
                className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
              >
                Gestionar en Control Pedidos
              </Link>
            </>
          )}
          <button
            onClick={() => navigate('/pedidos')}
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>
        </div>
      </div>
      {/* Área de impresión: solo visible al imprimir, sin precios */}
      <div className="print-area hidden p-4 text-sm">
        <div className="mb-3">
          <h1 className="text-lg font-bold">Pedido {pedido.numero_pedido}</h1>
          <p className="text-sm text-slate-600">
            Fecha creación: {new Date(pedido.created_at).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </p>
        </div>
        {pedido.observaciones && (
          <div className="mb-3">
            <p className="text-sm font-medium text-slate-700">Observaciones</p>
            <p className="text-sm text-slate-900">{pedido.observaciones}</p>
          </div>
        )}
        <div className="mb-3 rounded border border-slate-300 p-3">
          <p className="mb-1 text-sm font-medium text-slate-700">Cliente</p>
          <p className="text-sm font-semibold">{cliente?.razon_social}</p>
          <p className="text-sm">
            {cliente?.tipo_documento} {cliente?.numero_identificacion}
            {cliente?.dv != null && cliente.dv !== '' ? `-${cliente.dv}` : ''}
          </p>
          {cliente?.direccion && <p className="text-sm">{cliente.direccion}</p>}
          {cliente?.ciudad && (
            <p className="text-sm">
              {cliente.ciudad}
              {cliente.departamento ? `, ${cliente.departamento}` : ''}
            </p>
          )}
          {cliente?.telefono && <p className="text-sm">Tel: {cliente.telefono}</p>}
          {cliente?.email && <p className="text-sm">Email: {cliente.email}</p>}
          {cliente?.regimen && <p className="text-sm">Régimen: {cliente.regimen}</p>}
        </div>
        <table className="w-full border-collapse border border-slate-300 text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 px-3 py-2 text-left font-medium">Nº Referencia</th>
              <th className="border border-slate-300 px-3 py-2 text-left font-medium">Producto</th>
              <th className="border border-slate-300 px-3 py-2 text-right font-medium">Cantidad</th>
              <th className="print-check-header border border-slate-300 pl-3 pr-1 py-2 text-center font-medium text-[9px]">A1</th>
              <th className="print-check-header border border-slate-300 px-1 py-2 text-center font-medium text-[9px]">Check</th>
              <th className="print-check-header border border-slate-300 pl-1 pr-2 py-2 text-center font-medium text-[9px]">Packed</th>
            </tr>
          </thead>
          <tbody>
            {pedido.detalles.map((d) => {
              const prod = productos[d.producto_id]
              const codigo = prod && pedido.lista_precios
                ? getCodigoByLista(prod, pedido.lista_precios)
                : (prod && getCodigoDisplay(prod)) || '—'
              return (
                <tr key={d.id}>
                  <td className="border border-slate-300 px-3 py-1.5">{codigo}</td>
                  <td className="border border-slate-300 px-3 py-1.5">{prod?.referencia || `#${d.producto_id}`}</td>
                  <td className="border border-slate-300 px-3 py-1.5 text-right">{d.cantidad}</td>
                  <td className="border border-slate-300 px-1 py-1.5 text-center">
                    <span className="inline-block h-3 w-3 border border-slate-400" />
                  </td>
                  <td className="border border-slate-300 px-1 py-1.5 text-center">
                    <span className="inline-block h-3 w-3 border border-slate-400" />
                  </td>
                  <td className="border border-slate-300 px-1 py-1.5 text-center">
                    <span className="inline-block h-3 w-3 border border-slate-400" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="no-print space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">
            Cliente: <span className="font-medium">{cliente?.razon_social}</span>
          </p>
          <p className="text-sm text-slate-600">
            Estado:{' '}
            <span className="font-medium capitalize">{pedido.estado.replace('_', ' ')}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-4">
            {pedido.estado !== 'enviado' && pedido.estado !== 'cancelado' && (() => {
              const dias = diasSinEnviar(pedido.created_at, pedido.estado)
              return dias !== null ? (
                <div className={`rounded-lg border-2 px-4 py-2 font-medium ${colorDias(dias)}`}>
                  <span className="text-xs uppercase">Días sin enviar</span>
                  <p className="text-lg font-bold">{dias}</p>
                </div>
              ) : null
            })()}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium uppercase text-slate-500">
                Intención de envío
              </label>
              {pedido.estado !== 'enviado' && pedido.estado !== 'cancelado' && isAdmin ? (
                <select
                  value={pedido.intencion_envio ?? ''}
                  onChange={(e) => handleIntencionChange(e.target.value as IntencionEnvio | '')}
                  disabled={intencionMutation.isPending}
                  className={`rounded-lg border-2 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 ${colorIntencion(pedido.intencion_envio ?? undefined)}`}
                >
                  <option value="">Seleccionar...</option>
                  {OPCIONES_INTENCION.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={`rounded-lg border-2 px-4 py-2 font-medium ${colorIntencion(pedido.intencion_envio ?? undefined)}`}>
                  {labelIntencion(pedido.intencion_envio ?? undefined)}
                </div>
              )}
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            Creado: {new Date(pedido.created_at).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          {pedido.observaciones && (
            <div className="mt-2">
              <p className="text-sm text-slate-600">
                Observaciones:{' '}
                <span className="font-medium text-slate-900">{pedido.observaciones}</span>
              </p>
            </div>
          )}
          {pedido.estado === 'enviado' && (
            <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-medium uppercase text-slate-500">Datos de entrega</p>
              <p className="text-sm">
                {pedido.fecha_envio &&
                  `Enviado: ${new Date(pedido.fecha_envio).toLocaleString('es-CO')}`}
                {pedido.transportadora && ` • ${pedido.transportadora}`}
                {pedido.numero_factura && ` • Factura: ${pedido.numero_factura}`}
                {pedido.numero_guia && ` • Guía: ${pedido.numero_guia}`}
              </p>
              {(pedido as PedidoConDetalles).usuario_envio && (
                <p className="text-xs text-slate-500">
                  Por: {(pedido as PedidoConDetalles).usuario_envio?.nombre}
                </p>
              )}
              {pedido.resumen_envio && (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2">
                  <p className="text-xs font-medium text-amber-900">Resumen de envío</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-amber-800">
                    {pedido.resumen_envio}
                  </p>
                </div>
              )}
            </div>
          )}
          <p className="text-sm text-slate-600">
            Total:{' '}
            <span className="font-medium">
              {formatPesos(
                pedido.detalles?.length
                  ? pedido.detalles.reduce((s, d) => s + (d.subtotal ?? 0), 0) *
                      (1 - ((pedido.descuento ?? 0) / 100))
                  : pedido.total
              )}
            </span>
          </p>
          {pedido.lista_precios && (
            <p className="text-sm text-slate-600">
              Lista: <span className="font-medium capitalize">{pedido.lista_precios.replace('_', ' ')}</span>
            </p>
          )}
          {(pedido.descuento ?? 0) > 0 && (
            <p className="text-sm text-slate-600">
              Descuento: <span className="font-medium">{pedido.descuento}%</span>
            </p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-[1fr_120px_1fr_80px_100px_100px] gap-4 border-b border-slate-200 px-4 py-3 font-medium text-slate-900">
            <span>Producto</span>
            <span>Material</span>
            <span>Código</span>
            <span className="text-right">Cantidad</span>
            <span className="text-right">Precio unit.</span>
            <span className="text-right">Subtotal</span>
          </div>
          <div className="divide-y divide-slate-200">
            {pedido.detalles.map((d) => {
              const prod = productos[d.producto_id]
              const material = prod?.material || '—'
              const codigo = prod && pedido.lista_precios
                ? getCodigoByLista(prod, pedido.lista_precios)
                : (prod && getCodigoDisplay(prod)) || '—'
              return (
                <div
                  key={d.id}
                  className="grid min-w-[640px] grid-cols-[1fr_120px_1fr_80px_100px_100px] gap-4 px-4 py-3"
                >
                  <span>{prod?.referencia || `#${d.producto_id}`}</span>
                  <span className="text-slate-600">{material}</span>
                  <span className="text-slate-600">{codigo}</span>
                  <span className="text-right">{d.cantidad}</span>
                  <span className="text-right">{formatPesos(d.precio_unitario)}</span>
                  <span className="text-right">{formatPesos(d.subtotal)}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
