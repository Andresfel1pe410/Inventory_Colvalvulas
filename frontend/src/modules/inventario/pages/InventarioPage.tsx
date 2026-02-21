import { useState, useEffect, useCallback } from 'react'
import { DataTable, Column, Pagination } from '@/shared/components'
import { inventarioService } from '../services/inventario.service'
import { productoService } from '@/modules/productos/services/producto.service'
import { pedidoService } from '@/modules/pedidos/services/pedido.service'
import { clienteService } from '@/modules/clientes/services/cliente.service'
import { EntradaInventarioModal } from '../components/EntradaInventarioModal'
import type { InventarioResumen } from '../types/inventario.types'
import type { Producto } from '@/modules/productos/types/producto.types'
import type { Pedido } from '@/modules/pedidos/types/pedido.types'
import type { Cliente } from '@/modules/clientes/types/cliente.types'

type FiltroPedidos = 'todos' | number[]  // 'todos' = todos, number[] = IDs seleccionados

export function InventarioPage() {
  const [inventarios, setInventarios] = useState<(InventarioResumen & { producto?: Producto })[]>([])
  const [pedidosActivos, setPedidosActivos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Record<number, Cliente>>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(100)
  const [modalEntradaOpen, setModalEntradaOpen] = useState(false)
  const [filtroPedidos, setFiltroPedidos] = useState<FiltroPedidos>('todos')
  const [filtroOpen, setFiltroOpen] = useState(false)
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState<Set<number>>(new Set())

  const loadPedidosActivos = useCallback(async () => {
    try {
      const [pedData, cliData] = await Promise.all([
        pedidoService.list({ limit: 200, estados: 'en_espera,en_proceso' }),
        clienteService.list({ limit: 500 }),
      ])
      setPedidosActivos(pedData)
      setClientes(Object.fromEntries(cliData.map((c) => [c.id, c])))
    } catch {
      setPedidosActivos([])
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: { skip: number; limit: number; pedido_ids?: string } = {
        skip: (page - 1) * limit,
        limit,
      }
      if (filtroPedidos !== 'todos' && filtroPedidos.length > 0) {
        params.pedido_ids = filtroPedidos.join(',')
      }
      const [invData, prodData] = await Promise.all([
        inventarioService.list(params),
        productoService.list({ limit: 500 }),
      ])
      const prodMap = Object.fromEntries(prodData.map((p) => [p.id, p]))
      setInventarios(
        invData.map((i) => ({ ...i, producto: prodMap[i.producto_id] }))
      )
    } catch {
      setInventarios([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, filtroPedidos])

  useEffect(() => {
    loadPedidosActivos()
  }, [loadPedidosActivos])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (filtroOpen) {
      setPedidosSeleccionados(
        filtroPedidos === 'todos' ? new Set() : new Set(filtroPedidos)
      )
    }
  }, [filtroOpen, filtroPedidos])

  const aplicarFiltroTodos = () => {
    setFiltroPedidos('todos')
    setPedidosSeleccionados(new Set())
    setFiltroOpen(false)
  }

  const aplicarFiltroSeleccionados = () => {
    if (pedidosSeleccionados.size > 0) {
      setFiltroPedidos(Array.from(pedidosSeleccionados))
    } else {
      setFiltroPedidos('todos')
    }
    setFiltroOpen(false)
  }

  const togglePedido = (id: number) => {
    setPedidosSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const seleccionarTodos = () => {
    setPedidosSeleccionados(new Set(pedidosActivos.map((p) => p.id)))
  }

  const deseleccionarTodos = () => {
    setPedidosSeleccionados(new Set())
  }

  const filtroLabel =
    filtroPedidos === 'todos'
      ? 'Todos los pedidos'
      : `${filtroPedidos.length} pedido(s) seleccionado(s)`

  const columns: Column<InventarioResumen & { producto?: Producto }>[] = [
    {
      key: 'producto_id',
      header: 'Producto',
      render: (i) => i.producto?.referencia || i.producto?.codigo || `#${i.producto_id}`,
    },
    {
      key: 'stock_actual',
      header: 'Stock actual',
      render: (i) => (
        <span className={i.stock_actual < 0 ? 'font-medium text-red-600' : ''}>
          {i.stock_actual}
        </span>
      ),
    },
    {
      key: 'cantidad_requerida',
      header: 'Requerido (pedidos)',
      render: (i) => (
        <span className={i.cantidad_requerida > 0 ? 'font-medium text-amber-600' : ''}>
          {i.cantidad_requerida}
        </span>
      ),
    },
    {
      key: 'stock_disponible',
      header: 'Disponible',
      render: (i) => (
        <span
          className={
            i.stock_disponible < 0
              ? 'font-semibold text-red-600'
              : i.stock_disponible < (i.stock_minimo || 0)
                ? 'font-medium text-amber-600'
                : ''
          }
        >
          {i.stock_disponible}
        </span>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Inventario</h1>
        <div className="flex items-center gap-2">
          {/* Filtro de pedidos */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFiltroOpen(!filtroOpen)}
              className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {filtroLabel}
              <svg className={`h-4 w-4 transition ${filtroOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {filtroOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFiltroOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                  <div className="border-b border-slate-200 px-3 pb-2">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Calcular Requerido y Disponible con:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={aplicarFiltroTodos}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${filtroPedidos === 'todos' ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                      {filtroPedidos === 'todos' && (
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    Todos los pedidos (balance total)
                  </button>
                  <div className="max-h-48 overflow-y-auto border-t border-slate-200">
                    {pedidosActivos.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePedido(p.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${pedidosSeleccionados.has(p.id) ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                          {pedidosSeleccionados.has(p.id) && (
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">
                          {p.numero_pedido} - {clientes[p.cliente_id]?.razon_social || '?'} ({p.estado.replace('_', ' ')})
                        </span>
                      </button>
                    ))}
                    {pedidosActivos.length === 0 && (
                      <p className="px-3 py-4 text-center text-sm text-slate-500">
                        No hay pedidos en espera o proceso
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 border-t border-slate-200 px-3 pt-2">
                    <button
                      type="button"
                      onClick={seleccionarTodos}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={deseleccionarTodos}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      Ninguno
                    </button>
                    <button
                      type="button"
                      onClick={aplicarFiltroSeleccionados}
                      className="ml-auto rounded bg-primary-600 px-3 py-1 text-xs text-white hover:bg-primary-700"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setModalEntradaOpen(true)}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Agregar entrada
          </button>
        </div>
      </div>
      <EntradaInventarioModal
        open={modalEntradaOpen}
        onClose={() => setModalEntradaOpen(false)}
        onCreated={load}
      />
      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Cargando...
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={inventarios}
            keyExtractor={(i) => i.id}
            emptyMessage="No hay registros de inventario"
          />
          <Pagination
            page={page}
            total={inventarios.length}
            limit={limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
