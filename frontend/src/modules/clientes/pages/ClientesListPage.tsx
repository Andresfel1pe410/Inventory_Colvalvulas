import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  DataTable,
  Column,
  Pagination,
  ConfirmDialog,
  CopyableCell,
} from '@/shared/components'
import { clienteService } from '../services/cliente.service'
import type { Cliente } from '../types/cliente.types'

const columns: Column<Cliente>[] = [
  {
    key: 'tipo_documento',
    header: 'Tipo Doc.',
    width: '80px',
    render: (c) => <CopyableCell value={c.tipo_documento} truncate={false} />,
  },
  {
    key: 'numero_identificacion',
    header: 'Nº Documento',
    width: '120px',
    render: (c) => (
      <CopyableCell value={c.numero_identificacion} maxWidth="100px" truncate />
    ),
  },
  {
    key: 'razon_social',
    header: 'Razón Social',
    width: '280px',
    render: (c) => (
      <CopyableCell value={c.razon_social} maxWidth="260px" truncate />
    ),
  },
  {
    key: 'departamento',
    header: 'Departamento',
    width: '140px',
    render: (c) => (
      <CopyableCell value={c.departamento || ''} maxWidth="120px" truncate />
    ),
  },
  {
    key: 'ciudad',
    header: 'Ciudad',
    width: '140px',
    render: (c) => (
      <CopyableCell value={c.ciudad || ''} maxWidth="120px" truncate />
    ),
  },
  {
    key: 'email',
    header: 'Correo',
    width: '200px',
    render: (c) => (
      <CopyableCell value={c.email || ''} maxWidth="180px" truncate />
    ),
  },
  {
    key: 'telefono',
    header: 'Teléfono',
    width: '110px',
    render: (c) => (
      <CopyableCell value={c.telefono || ''} maxWidth="90px" truncate />
    ),
  },
  {
    key: 'vendedor',
    header: 'Vendedor',
    width: '80px',
    render: (c) => (
      <CopyableCell value={c.vendedor || ''} truncate={false} />
    ),
  },
]

export function ClientesListPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await clienteService.list({
        skip: (page - 1) * limit,
        limit,
        search: searchDebounced.trim() || undefined,
      })
      setClientes(data)
    } catch {
      setClientes([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, searchDebounced])

  useEffect(() => {
    load()
  }, [load])

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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Buscar por número de documento o razón social..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-64"
          />
          <Link
            to="/clientes/nuevo"
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Nuevo cliente
          </Link>
        </div>
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
                      to={`/clientes/${c.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      Detalles
                    </Link>
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
