import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Column, Pagination, PageLoading } from '@/shared/components'
import { formatPesos } from '@/shared/utils/format'
import { usePedidosList } from '../hooks/usePedidos'
import { useClientesList } from '@/modules/clientes/hooks/useClientes'
import type { Pedido } from '../types/pedido.types'

const EyeIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
)
const PencilIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
)
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

export function PedidosListPage() {
  const [page, setPage] = useState(1)
  const limit = 20

  const { data: pedidos = [], isLoading } = usePedidosList({
    skip: (page - 1) * limit,
    limit,
  })
  const { data: clientesData = [] } = useClientesList({ limit: 500 })
  const clientes = Object.fromEntries(clientesData.map((c) => [c.id, c]))

  const columns: Column<Pedido>[] = [
    { key: 'numero_pedido', header: 'Nº Pedido' },
    {
      key: 'cliente_id',
      header: 'Cliente',
      width: '250px',
      render: (p) => {
        const nombre = clientes[p.cliente_id]?.razon_social || `#${p.cliente_id}`
        return (
          <span className="block max-w-[250px] truncate" title={nombre}>
            {nombre}
          </span>
        )
      },
    },
    { key: 'estado', header: 'Estado' },
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
      key: 'total',
      header: 'Total',
      render: (p) => formatPesos(p.total),
    },
    {
      key: 'observaciones',
      header: 'Observaciones',
      render: (p) => (
        <span className="max-w-[200px] truncate block" title={p.observaciones || ''}>
          {p.observaciones || '—'}
        </span>
      ),
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
      {isLoading ? (
        <PageLoading />
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
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/pedidos/${p.id}`}
                      className="rounded p-1.5 text-primary-600 hover:bg-primary-50"
                      title="Ver"
                    >
                      <EyeIcon />
                    </Link>
                    {p.estado !== 'enviado' && p.estado !== 'cancelado' && (
                      <Link
                        to={`/pedidos/${p.id}/editar`}
                        className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                        title="Editar"
                      >
                        <PencilIcon />
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
