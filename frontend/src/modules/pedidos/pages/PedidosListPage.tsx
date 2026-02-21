import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Column, Pagination } from '@/shared/components'
import { formatPesos } from '@/shared/utils/format'
import { pedidoService } from '../services/pedido.service'
import { clienteService } from '@/modules/clientes/services/cliente.service'
import type { Pedido } from '../types/pedido.types'
import type { Cliente } from '@/modules/clientes/types/cliente.types'

export function PedidosListPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [clientes, setClientes] = useState<Record<number, Cliente>>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const load = async () => {
    setLoading(true)
    try {
      const [pedData, cliData] = await Promise.all([
        pedidoService.list({ skip: (page - 1) * limit, limit }),
        clienteService.list({ limit: 500 }),
      ])
      setPedidos(pedData)
      setClientes(Object.fromEntries(cliData.map((c) => [c.id, c])))
    } catch {
      setPedidos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page])

  const columns: Column<Pedido>[] = [
    { key: 'numero_pedido', header: 'Nº Pedido' },
    {
      key: 'cliente_id',
      header: 'Cliente',
      render: (p) => clientes[p.cliente_id]?.nombre || `#${p.cliente_id}`,
    },
    { key: 'estado', header: 'Estado' },
    {
      key: 'total',
      header: 'Total',
      render: (p) => formatPesos(p.total),
    },
  ]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Pedidos</h1>
        <Link
          to="/pedidos/nuevo"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Nuevo pedido
        </Link>
      </div>
      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Cargando...
        </div>
      ) : (
        <>
          <DataTable
            columns={[
              ...columns,
              {
                key: 'actions',
                header: 'Acciones',
                width: '100px',
                render: (p) => (
                  <div className="flex gap-2">
                    <Link
                      to={`/pedidos/${p.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      Ver
                    </Link>
                    {p.estado !== 'enviado' && p.estado !== 'cancelado' && (
                      <Link
                        to={`/pedidos/${p.id}/editar`}
                        className="text-slate-600 hover:underline"
                      >
                        Editar
                      </Link>
                    )}
                  </div>
                ),
              },
            ]}
            data={pedidos}
            keyExtractor={(p) => p.id}
          />
          <Pagination
            page={page}
            total={pedidos.length}
            limit={limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
