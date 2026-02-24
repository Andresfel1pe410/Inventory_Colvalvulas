import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, Column, ConfirmDialog, PageLoading } from '@/shared/components'
import { formatPesos } from '@/shared/utils/format'
import { useProductosList, useProductoDelete } from '../hooks/useProductos'
import { LISTAS_PRECIOS, LISTA_LABELS } from '../types/producto.types'
import type { Producto } from '../types/producto.types'
import { useAuthStore } from '@/modules/auth'

function getListaCodigo(p: Producto, lista: string): string {
  const lp = p.listas_precio?.find((l) => l.lista === lista)
  return lp?.codigo ?? '—'
}

function getListaPrecio(p: Producto, lista: string): string {
  const lp = p.listas_precio?.find((l) => l.lista === lista)
  return lp ? formatPesos(lp.precio) : '—'
}

function buildListaColumns(listas: readonly string[]): Column<Producto>[] {
  return [
    { key: 'referencia', header: 'Referencia' },
    { key: 'material', header: 'Material' },
    ...listas.flatMap(
      (lista): Column<Producto>[] => [
        {
          key: `${lista}_codigo`,
          header: `${LISTA_LABELS[lista] ?? lista} (código)`,
          render: (p) => getListaCodigo(p, lista),
        },
        {
          key: `${lista}_precio`,
          header: `${LISTA_LABELS[lista] ?? lista} (precio)`,
          render: (p) => getListaPrecio(p, lista),
        },
      ]
    ),
  ]
}

export function ProductosListPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.roles?.includes('admin')
  const listasVendedor =
    user?.listas_precio && user.listas_precio.length > 0
      ? user.listas_precio
      : [...LISTAS_PRECIOS]
  const listasToShow = isAdmin ? [...LISTAS_PRECIOS] : listasVendedor
  const baseColumns = buildListaColumns(listasToShow)

  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [listaFilter, setListaFilter] = useState<string>('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: productosData = [], isLoading } = useProductosList({
    search: searchDebounced.trim() || undefined,
    limit: 10000,
    lista: listaFilter || undefined,
  })
  const productos = [...productosData].sort((a, b) =>
    (a.referencia || '').localeCompare(b.referencia || '', 'es')
  )
  const deleteMutation = useProductoDelete()

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
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
            {listasToShow.map((k) => (
              <option key={k} value={k}>
                {LISTA_LABELS[k] ?? k}
              </option>
            ))}
          </select>
          {isAdmin && (
            <Link
              to="/productos/nuevo"
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Nuevo producto
            </Link>
          )}
        </div>
      </div>
      {isLoading ? (
        <PageLoading />
      ) : (
        <>
          <DataTable
            columns={[
              ...baseColumns,
              ...(isAdmin
                ? [
                    {
                      key: 'actions',
                      header: 'Acciones',
                      width: '180px',
                      render: (p: Producto) => (
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
                  ]
                : []),
            ]}
            data={productos}
            keyExtractor={(p) => p.id}
          />
          <p className="mt-2 text-sm text-slate-600">
            Total: {productos.length} registro{productos.length !== 1 ? 's' : ''}
          </p>
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
