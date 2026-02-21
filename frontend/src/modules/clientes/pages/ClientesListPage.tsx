import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Column, Pagination, ConfirmDialog } from '@/shared/components'
import { clienteService } from '../services/cliente.service'
import type { Cliente } from '../types/cliente.types'

const columns: Column<Cliente>[] = [
  { key: 'codigo', header: 'Código' },
  {
    key: 'razon_social',
    header: 'Razón Social',
    render: (c) => c.razon_social || c.nombre,
  },
  { key: 'nit', header: 'NIT' },
  { key: 'nombre_gerente', header: 'Gerente' },
  { key: 'telefono', header: 'Teléfono' },
  { key: 'ciudad', header: 'Ciudad' },
  {
    key: 'activo',
    header: 'Activo',
    render: (c) => (c.activo ? 'Sí' : 'No'),
  },
]

export function ClientesListPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await clienteService.list({
        skip: (page - 1) * limit,
        limit,
        activos_only: false,
      })
      setClientes(data)
    } catch {
      setClientes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await clienteService.delete(deleteId)
      setDeleteId(null)
      load()
    } catch {
      setDeleteId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <Link
          to="/clientes/nuevo"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Nuevo cliente
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
                width: '180px',
                render: (c) => (
                  <div className="flex gap-2">
                    <Link
                      to={`/clientes/${c.id}/editar`}
                      className="text-primary-600 hover:underline"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                ),
              },
            ]}
            data={clientes}
            keyExtractor={(c) => c.id}
          />
          <Pagination
            page={page}
            total={clientes.length}
            limit={limit}
            onPageChange={setPage}
          />
        </>
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar cliente"
        message="¿Está seguro de eliminar este cliente?"
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
