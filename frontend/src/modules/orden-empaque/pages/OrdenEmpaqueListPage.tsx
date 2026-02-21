import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Column, Pagination } from '@/shared/components'
import { ordenEmpaqueService } from '../services/ordenEmpaque.service'
import { CrearOrdenModal } from '../components/CrearOrdenModal'
import type { OrdenEmpaque } from '../types/ordenEmpaque.types'

const columns: Column<OrdenEmpaque>[] = [
  { key: 'numero_orden', header: 'Nº Orden' },
  { key: 'pedido_id', header: 'Pedido ID' },
  { key: 'estado', header: 'Estado' },
]

export function OrdenEmpaqueListPage() {
  const [ordenes, setOrdenes] = useState<OrdenEmpaque[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [modalOpen, setModalOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await ordenEmpaqueService.list({
        skip: (page - 1) * limit,
        limit,
      })
      setOrdenes(data)
    } catch {
      setOrdenes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Órdenes de Empaque</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Nueva orden
        </button>
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
                width: '120px',
                render: (o) =>
                  o.estado !== 'cerrada' ? (
                    <Link
                      to={`/orden-empaque/${o.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      Empacar
                    </Link>
                  ) : (
                    <span className="text-slate-400">Cerrada</span>
                  ),
              },
            ]}
            data={ordenes}
            keyExtractor={(o) => o.id}
            emptyMessage="No hay órdenes de empaque"
          />
          <Pagination
            page={page}
            total={ordenes.length}
            limit={limit}
            onPageChange={setPage}
          />
        </>
      )}
      <CrearOrdenModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={load}
      />
    </div>
  )
}
