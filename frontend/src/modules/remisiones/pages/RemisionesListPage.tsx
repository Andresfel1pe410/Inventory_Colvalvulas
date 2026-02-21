import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Column, Pagination } from '@/shared/components'
import { remisionService } from '../services/remision.service'
import { clienteService } from '@/modules/clientes/services/cliente.service'
import type { Remision } from '../types/remision.types'
import type { Cliente } from '@/modules/clientes/types/cliente.types'

export function RemisionesListPage() {
  const [remisiones, setRemisiones] = useState<Remision[]>([])
  const [clientes, setClientes] = useState<Record<number, Cliente>>({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)

  const load = async () => {
    setLoading(true)
    try {
      const [remData, cliData] = await Promise.all([
        remisionService.list({ skip: (page - 1) * limit, limit }),
        clienteService.list({ limit: 500 }),
      ])
      setRemisiones(remData)
      setClientes(Object.fromEntries(cliData.map((c) => [c.id, c])))
    } catch {
      setRemisiones([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page])

  const columns: Column<Remision>[] = [
    { key: 'numero_remision', header: 'Nº Remisión' },
    {
      key: 'cliente_id',
      header: 'Cliente',
      render: (r) =>
        clientes[r.cliente_id]?.razon_social || `#${r.cliente_id}`,
    },
    {
      key: 'numero_factura',
      header: 'Factura',
      render: (r) => r.numero_factura || '-',
    },
    { key: 'estado', header: 'Estado' },
    {
      key: 'fecha_emision',
      header: 'Fecha emisión',
      render: (r) => (r.fecha_emision ? new Date(r.fecha_emision).toLocaleDateString() : '-'),
    },
    {
      key: 'actions',
      header: 'Acciones',
      width: '120px',
      render: (r) =>
        r.pedido_id ? (
          <Link
            to={`/pedidos/${r.pedido_id}`}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            Ver pedido
          </Link>
        ) : (
          '-'
        ),
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Remisiones</h1>
        <p className="mt-1 text-sm text-slate-500">
          Se generan automáticamente al marcar un pedido como Enviado en Control Pedidos
        </p>
      </div>
      {loading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Cargando...
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={remisiones}
            keyExtractor={(r) => r.id}
            emptyMessage="No hay remisiones. Se crean al marcar pedidos como Enviado."
          />
          <Pagination
            page={page}
            total={remisiones.length}
            limit={limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
