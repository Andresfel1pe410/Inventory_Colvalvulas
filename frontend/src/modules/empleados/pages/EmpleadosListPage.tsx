import { useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, ConfirmDialog, PageLoading } from '@/shared/components'
import { useSectionPath } from '@/app/routing/sectionPath'
import { useEmpleadosList, useEmpleadoDelete } from '../hooks/useEmpleados'
import type { Empleado } from '../types/empleado.types'

export function EmpleadosListPage() {
  const sectionPath = useSectionPath()
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const { data: empleados = [], isLoading } = useEmpleadosList({
    search: search.trim() || undefined,
    limit: 1000,
  })
  const deleteMutation = useEmpleadoDelete()

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
        <h1 className="text-2xl font-semibold text-slate-900">Empleados</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Buscar por nombre o documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-64"
          />
          <Link
            to={sectionPath('/empleados/nuevo')}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Agregar empleado
          </Link>
        </div>
      </div>
      {isLoading ? (
        <PageLoading />
      ) : (
        <>
          <DataTable
            columns={[
              { key: 'nombre', header: 'Nombre', render: (e: Empleado) => e.nombre },
              { key: 'cargo', header: 'Cargo', render: (e: Empleado) => e.cargo || '-' },
              {
                key: 'activo',
                header: 'Estado',
                width: '110px',
                render: (e: Empleado) => (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      e.activo ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {e.activo ? 'Activo' : 'Inactivo'}
                  </span>
                ),
              },
              {
                key: 'fingerprint_id',
                header: 'Fingerprint ID',
                width: '130px',
                render: (e: Empleado) => e.fingerprint_id ?? '-',
              },
              {
                key: 'actions',
                header: 'Acciones',
                width: '160px',
                render: (e: Empleado) => (
                  <div className="flex gap-2">
                    <Link
                      to={sectionPath(`/empleados/${e.id}/editar`)}
                      className="text-primary-600 hover:underline"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => setDeleteId(e.id)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </div>
                ),
              },
            ]}
            data={empleados}
            keyExtractor={(e) => e.id}
            emptyMessage="No hay empleados registrados"
          />
          <p className="mt-2 text-sm text-slate-600">
            Total: {empleados.length} registro{empleados.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar empleado"
        message="El empleado quedará inactivo y no aparecerá en el control de asistencia, pero se conserva su historial. ¿Continuar?"
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  )
}
