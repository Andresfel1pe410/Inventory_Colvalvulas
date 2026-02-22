import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Column, Pagination, ConfirmDialog } from '@/shared/components'
import { formatPesos } from '@/shared/utils/format'
import { productoService } from '../services/producto.service'
import { LISTA_LABELS, getCodigoDisplay } from '../types/producto.types'
import type { Producto } from '../types/producto.types'

const columns: Column<Producto>[] = [
  {
    key: 'codigo',
    header: 'Código',
    render: (p) => getCodigoDisplay(p) || '—',
  },
  { key: 'referencia', header: 'Referencia' },
  { key: 'material', header: 'Material' },
  {
    key: 'listas',
    header: 'Listas',
    render: (p) =>
      p.listas_precio
        ?.map((lp) => `${LISTA_LABELS[lp.lista] ?? lp.lista}: ${lp.codigo} ${formatPesos(lp.precio)}`)
        .join(' | ') ?? '—',
  },
]

export function ProductosListPage() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [listaFilter, setListaFilter] = useState<string>('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await productoService.list({
        skip: (page - 1) * limit,
        limit,
        activos_only: false,
        search: searchDebounced.trim() || undefined,
        lista: listaFilter || undefined,
      })
      setProductos(data)
    } catch {
      setProductos([])
    } finally {
      setLoading(false)
    }
  }, [page, limit, searchDebounced, listaFilter])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await productoService.delete(deleteId)
      setDeleteId(null)
      load()
    } catch {
      setDeleteId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Productos</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Buscar por código, referencia o material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-64"
          />
          <select
            value={listaFilter}
            onChange={(e) => setListaFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todas las listas</option>
            {Object.entries(LISTA_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <Link
            to="/productos/nuevo"
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Nuevo producto
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
                render: (p) => (
                  <div className="flex gap-2">
                    <Link
                      to={`/productos/${p.id}/editar`}
                      className="text-primary-600 hover:underline"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => setDeleteId(p.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                ),
              },
            ]}
            data={productos}
            keyExtractor={(p) => p.id}
          />
          <Pagination
            page={page}
            total={productos.length}
            limit={limit}
            onPageChange={setPage}
          />
        </>
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar producto"
        message="¿Está seguro de eliminar este producto?"
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
