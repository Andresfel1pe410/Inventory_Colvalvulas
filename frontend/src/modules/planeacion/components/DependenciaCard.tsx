import { Link } from 'react-router-dom'
import { useSectionPath } from '@/app/routing/sectionPath'
import type { DependenciaListItem } from '../types/planeacion.types'

export function DependenciaCard({ dependencia }: { dependencia: DependenciaListItem }) {
  const sectionPath = useSectionPath()

  return (
    <Link
      to={sectionPath(`/planeacion/${dependencia.id}`)}
      className="block rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-primary-300 hover:shadow-md"
    >
      <p className="text-base font-semibold text-slate-900">{dependencia.nombre}</p>
      <p className="mt-1 text-sm text-slate-500">
        {dependencia.empleados_count} {dependencia.empleados_count === 1 ? 'empleado asignado' : 'empleados asignados'}
      </p>
    </Link>
  )
}
