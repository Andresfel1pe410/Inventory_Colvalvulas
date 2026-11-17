import { useState } from 'react'
import { PageLoading } from '@/shared/components'
import { useDependenciasList } from '../hooks/usePlaneacion'
import { DependenciaCard } from '../components/DependenciaCard'
import { CrearDependenciaModal } from '../components/CrearDependenciaModal'

export function PlaneacionListPage() {
  const [crearOpen, setCrearOpen] = useState(false)
  const { data: dependencias = [], isLoading } = useDependenciasList()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Planeación</h1>
        <button
          type="button"
          onClick={() => setCrearOpen(true)}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Crear dependencia
        </button>
      </div>

      {isLoading ? (
        <PageLoading />
      ) : dependencias.length === 0 ? (
        <p className="text-sm text-slate-500">
          No hay dependencias todavía. Crea una para empezar a asignar empleados y tareas.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dependencias.map((d) => (
            <DependenciaCard key={d.id} dependencia={d} />
          ))}
        </div>
      )}

      <CrearDependenciaModal open={crearOpen} onClose={() => setCrearOpen(false)} onCreated={() => setCrearOpen(false)} />
    </div>
  )
}
