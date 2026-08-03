import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageLoading } from '@/shared/components'
import { useSectionPath } from '@/app/routing/sectionPath'
import { useDependenciaDetalle, useQuitarEmpleado } from '../hooks/usePlaneacion'
import { AgregarEmpleadoControl } from '../components/AgregarEmpleadoControl'
import { AgregarTareaModal } from '../components/AgregarTareaModal'
import { TareaEstadoSelect } from '../components/TareaEstadoSelect'

export function DependenciaDetailPage() {
  const { id } = useParams()
  const dependenciaId = id ? Number(id) : 0
  const sectionPath = useSectionPath()
  const { data: dependencia, isLoading } = useDependenciaDetalle(dependenciaId)
  const quitarMutation = useQuitarEmpleado(dependenciaId)
  const [tareaModalEmpleado, setTareaModalEmpleado] = useState<{ id: number; nombre: string } | null>(null)

  if (isLoading) {
    return <PageLoading />
  }

  if (!dependencia) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
        Dependencia no encontrada
        <div className="mt-4">
          <Link to={sectionPath('/planeacion')} className="text-primary-600 hover:underline">
            Volver a Planeación
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={sectionPath('/planeacion')} className="text-sm text-primary-600 hover:underline">
          &larr; Volver a Planeación
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{dependencia.nombre}</h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-900">Agregar empleado a esta dependencia</h2>
        <AgregarEmpleadoControl
          dependenciaId={dependenciaId}
          empleadoIdsAsignados={dependencia.empleados.map((e) => e.empleado_id)}
        />
      </div>

      {dependencia.empleados.length === 0 ? (
        <p className="text-sm text-slate-500">Todavía no hay empleados asignados a esta dependencia.</p>
      ) : (
        <div className="space-y-4">
          {dependencia.empleados.map((emp) => (
            <div key={emp.empleado_id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{emp.nombre}</p>
                  {emp.cargo && <p className="text-xs text-slate-500">{emp.cargo}</p>}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTareaModalEmpleado({ id: emp.empleado_id, nombre: emp.nombre })}
                    className="text-sm text-primary-600 hover:underline"
                  >
                    Agregar tarea
                  </button>
                  <button
                    type="button"
                    onClick={() => quitarMutation.mutate(emp.empleado_id)}
                    disabled={quitarMutation.isPending}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    Quitar de la dependencia
                  </button>
                </div>
              </div>

              {emp.tareas.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Sin tareas asignadas</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {emp.tareas.map((tarea) => (
                    <li key={tarea.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                      <span className="text-sm text-slate-800">{tarea.descripcion}</span>
                      <TareaEstadoSelect dependenciaId={dependenciaId} tareaId={tarea.id} estado={tarea.estado} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {tareaModalEmpleado && (
        <AgregarTareaModal
          open={tareaModalEmpleado !== null}
          onClose={() => setTareaModalEmpleado(null)}
          dependenciaId={dependenciaId}
          empleadoId={tareaModalEmpleado.id}
          empleadoNombre={tareaModalEmpleado.nombre}
        />
      )}
    </div>
  )
}
