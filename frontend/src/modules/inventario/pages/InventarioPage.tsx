import { useState, useEffect, useCallback, useMemo } from 'react'
import { DataTable, Column } from '@/shared/components'
import { inventarioService } from '../services/inventario.service'
import { productoService } from '@/modules/productos/services/producto.service'
import { pedidoService } from '@/modules/pedidos/services/pedido.service'
import { clienteService } from '@/modules/clientes/services/cliente.service'
import { EntradaInventarioModal } from '../components/EntradaInventarioModal'
import { ReporteEntradasModal } from '../components/ReporteEntradasModal'
import type { InventarioResumen } from '../types/inventario.types'
import { getCodigoDisplay } from '@/modules/productos/types/producto.types'
import type { Producto } from '@/modules/productos/types/producto.types'
import type { Pedido, PedidoConDetalles } from '@/modules/pedidos/types/pedido.types'
import type { Cliente } from '@/modules/clientes/types/cliente.types'

type FiltroPedidos = 'todos' | number[]  // 'todos' = todos, number[] = IDs seleccionados
type FiltroProductos = 'todos' | number[]  // 'todos' = todos, number[] = IDs seleccionados

export function InventarioPage() {
  const [inventarios, setInventarios] = useState<(InventarioResumen & { producto?: Producto })[]>([])
  const [pedidosActivos, setPedidosActivos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Record<number, Cliente>>({})
  const [loading, setLoading] = useState(true)
  const [modalEntradaOpen, setModalEntradaOpen] = useState(false)
  const [modalReporteOpen, setModalReporteOpen] = useState(false)
  const [filtroPedidos, setFiltroPedidos] = useState<FiltroPedidos>('todos')
  const [filtroOpen, setFiltroOpen] = useState(false)
  const [pedidosSeleccionados, setPedidosSeleccionados] = useState<Set<number>>(new Set())
  const [filtroProductos, setFiltroProductos] = useState<FiltroProductos>('todos')
  const [filtroProductosOpen, setFiltroProductosOpen] = useState(false)
  const [productosSeleccionados, setProductosSeleccionados] = useState<Set<number>>(new Set())
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [soloNegativos, setSoloNegativos] = useState(false)
  const [pedidosConDetalles, setPedidosConDetalles] = useState<Record<number, PedidoConDetalles>>({})

  const loadPedidosActivos = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const [pedData, cliData] = await Promise.all([
        pedidoService.list({ limit: 200, estados: 'en_espera,en_proceso' }),
        clienteService.list({ limit: 500 }),
      ])
      if (!signal?.cancelled) {
        setPedidosActivos(pedData)
        setClientes(Object.fromEntries(cliData.map((c) => [c.id, c])))
      }
    } catch (err) {
      if ((err as Error).message === 'Request aborted') return
      if (!signal?.cancelled) setPedidosActivos([])
    }
  }, [])

  const load = useCallback(
    async (signal?: { cancelled: boolean }) => {
      setLoading(true)
      try {
        const params: { skip: number; limit: number; pedido_ids?: string } = {
          skip: 0,
          limit: 10000,
        }
        if (filtroPedidos !== 'todos' && filtroPedidos.length > 0) {
          params.pedido_ids = filtroPedidos.join(',')
        }
        const [invData, prodData] = await Promise.all([
          inventarioService.list(params),
          productoService.list({ limit: 10000 }),
        ])
        if (!signal?.cancelled) {
          const prodMap = Object.fromEntries(prodData.map((p) => [p.id, p]))
          setInventarios(
            invData.map((i) => ({ ...i, producto: prodMap[i.producto_id] }))
          )
        }
      } catch (err) {
        if ((err as Error).message === 'Request aborted') return
        if (!signal?.cancelled) setInventarios([])
      } finally {
        if (!signal?.cancelled) setLoading(false)
      }
    },
    [filtroPedidos]
  )

  useEffect(() => {
    const signal = { cancelled: false }
    loadPedidosActivos(signal)
    return () => {
      signal.cancelled = true
    }
  }, [loadPedidosActivos])

  useEffect(() => {
    const signal = { cancelled: false }
    load(signal)
    return () => {
      signal.cancelled = true
    }
  }, [load])

  useEffect(() => {
    if (pedidosActivos.length === 0) {
      setPedidosConDetalles({})
      return
    }
    Promise.all(pedidosActivos.map((p) => pedidoService.get(p.id)))
      .then((results) => {
        const map: Record<number, PedidoConDetalles> = {}
        results.forEach((ped) => { map[ped.id] = ped })
        setPedidosConDetalles(map)
      })
      .catch(() => setPedidosConDetalles({}))
  }, [pedidosActivos])

  useEffect(() => {
    if (filtroOpen) {
      setPedidosSeleccionados(
        filtroPedidos === 'todos' ? new Set() : new Set(filtroPedidos)
      )
    }
  }, [filtroOpen, filtroPedidos])

  useEffect(() => {
    if (filtroProductosOpen) {
      setProductosSeleccionados(
        filtroProductos === 'todos' ? new Set() : new Set(filtroProductos)
      )
      setBusquedaProducto('')
    }
  }, [filtroProductosOpen, filtroProductos])

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

  const aplicarFiltroProductosTodos = () => {
    setFiltroProductos('todos')
    setProductosSeleccionados(new Set())
    setFiltroProductosOpen(false)
  }

  const aplicarFiltroProductosSeleccionados = () => {
    if (productosSeleccionados.size > 0) {
      setFiltroProductos(Array.from(productosSeleccionados))
    } else {
      setFiltroProductos('todos')
    }
    setFiltroProductosOpen(false)
  }

  const toggleProducto = (id: number) => {
    setProductosSeleccionados((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const seleccionarTodosProductos = () => {
    setProductosSeleccionados(new Set(productosFiltrados.map((p) => p.id)))
  }

  const deseleccionarTodosProductos = () => {
    setProductosSeleccionados(new Set())
  }

  const filtroLabel =
    filtroPedidos === 'todos'
      ? 'Todos los pedidos'
      : `${filtroPedidos.length} pedido(s) seleccionado(s)`

  const stockPorProducto = useMemo(() => {
    const map: Record<number, number> = {}
    inventarios.forEach((i) => { map[i.producto_id] = i.stock_actual })
    return map
  }, [inventarios])

  const pedidoTieneStockCompleto = useMemo(() => {
    const result: Record<number, boolean> = {}
    Object.values(pedidosConDetalles).forEach((ped) => {
      if (!ped.detalles?.length) {
        result[ped.id] = true
        return
      }
      const completo = ped.detalles.every((d) => {
        const stock = stockPorProducto[d.producto_id] ?? 0
        return stock >= d.cantidad
      })
      result[ped.id] = completo
    })
    return result
  }, [pedidosConDetalles, stockPorProducto])

  const productosUnicos = useMemo(() => {
    let list = inventarios
    if (filtroPedidos !== 'todos' && filtroPedidos.length > 0) {
      list = list.filter((i) => i.cantidad_requerida > 0)
    }
    const seen = new Set<number>()
    return list
      .map((i) => i.producto)
      .filter((p): p is Producto => p != null)
      .filter((p) => {
        if (seen.has(p.id)) return false
        seen.add(p.id)
        return true
      })
      .sort((a, b) => {
        const refCmp = (a.referencia || '').localeCompare(b.referencia || '', 'es')
        if (refCmp !== 0) return refCmp
        return (a.material || '').localeCompare(b.material || '', 'es')
      })
  }, [inventarios, filtroPedidos])

  const productosFiltrados = useMemo(() => {
    const term = busquedaProducto.trim().toLowerCase()
    if (!term) return productosUnicos
    return productosUnicos.filter((p) => {
      const ref = (p.referencia || '').toLowerCase()
      const mat = (p.material || '').toLowerCase()
      const codigos = (p.listas_precio || [])
        .map((lp) => (lp.codigo || '').toLowerCase())
        .join(' ')
      return ref.includes(term) || mat.includes(term) || codigos.includes(term)
    })
  }, [productosUnicos, busquedaProducto])

  const inventariosOrdenados = useMemo(() => {
    let list = inventarios
    if (filtroPedidos !== 'todos' && filtroPedidos.length > 0) {
      list = list.filter((i) => i.cantidad_requerida > 0)
    }
    if (filtroProductos !== 'todos' && filtroProductos.length > 0) {
      const ids = new Set(filtroProductos)
      list = list.filter((i) => ids.has(i.producto_id))
    }
    if (soloNegativos) {
      list = list.filter((i) => i.stock_disponible < 0)
    }
    return [...list].sort((a, b) => {
      const refA = (a.producto?.referencia || '').toLowerCase()
      const refB = (b.producto?.referencia || '').toLowerCase()
      const matA = (a.producto?.material || '').toLowerCase()
      const matB = (b.producto?.material || '').toLowerCase()
      if (refA !== refB) return refA.localeCompare(refB)
      return matA.localeCompare(matB)
    })
  }, [inventarios, filtroProductos, soloNegativos])

  const columns: Column<InventarioResumen & { producto?: Producto }>[] = [
    {
      key: 'producto_id',
      header: 'Producto',
      render: (i) => i.producto?.referencia || (i.producto && getCodigoDisplay(i.producto)) || `#${i.producto_id}`,
    },
    {
      key: 'material',
      header: 'Material',
      render: (i) => i.producto?.material || '—',
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
                    {pedidosActivos.map((p) => {
                      const tieneStock = pedidoTieneStockCompleto[p.id]
                      return (
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
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: tieneStock === true ? '#22c55e' : tieneStock === false ? '#eab308' : '#94a3b8' }}
                            title={tieneStock === true ? 'Stock completo' : tieneStock === false ? 'Falta stock' : 'Calculando...'}
                          />
                          <span className="truncate">
                            {p.numero_pedido} - {clientes[p.cliente_id]?.razon_social || '?'} ({p.estado.replace('_', ' ')})
                          </span>
                        </button>
                      )
                    })}
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
          {/* Filtro disponible en negativo */}
          <button
            type="button"
            onClick={() => setSoloNegativos((s) => !s)}
            className={`flex items-center gap-2 rounded-md border px-4 py-2 text-sm ${
              soloNegativos
                ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded border ${soloNegativos ? 'border-red-600 bg-red-600' : 'border-slate-300'}`}>
              {soloNegativos && (
                <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </span>
            Solo en negativo
          </button>
          {/* Filtro por producto */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setFiltroProductosOpen(!filtroProductosOpen)}
              className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {filtroProductos === 'todos'
                ? 'Todos los productos'
                : `${filtroProductos.length} producto(s) seleccionado(s)`}
              <svg className={`h-4 w-4 transition ${filtroProductosOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {filtroProductosOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setFiltroProductosOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-96 rounded-lg border border-slate-200 bg-white py-2 shadow-lg">
                  <div className="border-b border-slate-200 px-3 pb-2">
                    <p className="text-xs font-medium uppercase text-slate-500 mb-2">
                      Filtrar por producto
                    </p>
                    <input
                      type="text"
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                      placeholder="Buscar por referencia, código o material..."
                      className="block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={aplicarFiltroProductosTodos}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className={`flex h-4 w-4 items-center justify-center rounded border ${filtroProductos === 'todos' ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                      {filtroProductos === 'todos' && (
                        <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    Todos los productos
                  </button>
                  <div className="max-h-56 overflow-y-auto border-t border-slate-200">
                    {productosFiltrados.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleProducto(p.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${productosSeleccionados.has(p.id) ? 'border-primary-600 bg-primary-600' : 'border-slate-300'}`}>
                          {productosSeleccionados.has(p.id) && (
                            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </span>
                        <span className="truncate">
                          {p.referencia} {p.material ? `(${p.material})` : ''}
                        </span>
                      </button>
                    ))}
                    {productosFiltrados.length === 0 && (
                      <p className="px-3 py-4 text-center text-sm text-slate-500">
                        {busquedaProducto.trim() ? 'Sin coincidencias' : 'No hay productos con inventario'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 border-t border-slate-200 px-3 pt-2">
                    <button
                      type="button"
                      onClick={seleccionarTodosProductos}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      Seleccionar todos
                    </button>
                    <button
                      type="button"
                      onClick={deseleccionarTodosProductos}
                      className="text-xs text-slate-500 hover:underline"
                    >
                      Ninguno
                    </button>
                    <button
                      type="button"
                      onClick={aplicarFiltroProductosSeleccionados}
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
            onClick={() => setModalReporteOpen(true)}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Reporte de entradas
          </button>
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
      <ReporteEntradasModal
        open={modalReporteOpen}
        onClose={() => setModalReporteOpen(false)}
      />
      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Cargando...
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={inventariosOrdenados}
            keyExtractor={(i) => i.id}
            emptyMessage="No hay registros de inventario"
          />
          <p className="mt-2 text-sm text-slate-600">
            {inventariosOrdenados.length < inventarios.length ? (
              <>Mostrando: {inventariosOrdenados.length} de {inventarios.length} registro{inventarios.length !== 1 ? 's' : ''}</>
            ) : (
              <>Total: {inventariosOrdenados.length} registro{inventariosOrdenados.length !== 1 ? 's' : ''}</>
            )}
          </p>
        </>
      )}
    </div>
  )
}
