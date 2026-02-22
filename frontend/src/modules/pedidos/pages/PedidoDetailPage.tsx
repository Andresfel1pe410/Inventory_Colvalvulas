import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { formatPesos } from '@/shared/utils/format'
import { pedidoService } from '../services/pedido.service'
import { productoService } from '@/modules/productos/services/producto.service'
import { clienteService } from '@/modules/clientes/services/cliente.service'
import type { PedidoConDetalles, Pedido } from '../types/pedido.types'
import { getCodigoDisplay, getCodigoByLista } from '@/modules/productos/types/producto.types'
import type { Producto } from '@/modules/productos/types/producto.types'
import type { Cliente } from '@/modules/clientes/types/cliente.types'

export function PedidoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [pedido, setPedido] = useState<PedidoConDetalles | null>(null)
  const [productos, setProductos] = useState<Record<number, Producto>>({})
  const [cliente, setCliente] = useState<Cliente | null>(null)

  useEffect(() => {
    if (!id) return
    pedidoService
      .get(Number(id))
      .then(async (p) => {
        setPedido(p)
        const [prods, cli] = await Promise.all([
          productoService.list({ limit: 500 }),
          clienteService.get(p.cliente_id),
        ])
        setProductos(Object.fromEntries(prods.map((pr) => [pr.id, pr])))
        setCliente(cli)
      })
      .catch(() => setPedido(null))
  }, [id])

  if (!pedido) {
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
          Pedido {pedido.numero_pedido}
        </h1>
        <div className="flex flex-wrap gap-2">
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
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-600">
            Cliente: <span className="font-medium">{cliente?.razon_social}</span>
          </p>
          <p className="text-sm text-slate-600">
            Estado:{' '}
            <span className="font-medium capitalize">{pedido.estado.replace('_', ' ')}</span>
          </p>
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
        <div className="rounded-lg border border-slate-200 bg-white">
          <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b border-slate-200 px-4 py-3 font-medium text-slate-900">
            <span>Producto</span>
            <span>Código</span>
            <span className="text-right">Cantidad x Precio</span>
          </div>
          <div className="divide-y divide-slate-200">
            {pedido.detalles.map((d) => {
              const prod = productos[d.producto_id]
              const codigo = prod && pedido.lista_precios
                ? getCodigoByLista(prod, pedido.lista_precios)
                : (prod && getCodigoDisplay(prod)) || '—'
              return (
                <div
                  key={d.id}
                  className="grid grid-cols-[1fr_1fr_auto] gap-4 px-4 py-3"
                >
                  <span>{prod?.referencia || `#${d.producto_id}`}</span>
                  <span className="text-slate-600">{codigo}</span>
                  <span className="text-right">
                    {d.cantidad} x {formatPesos(d.precio_unitario)} = {formatPesos(d.subtotal)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
