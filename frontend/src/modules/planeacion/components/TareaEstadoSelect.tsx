import { useActualizarEstadoTarea } from '../hooks/usePlaneacion'
import type { TareaEstado } from '../types/planeacion.types'

const LABEL_ESTADO: Record<TareaEstado, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  hecha: 'Hecha',
}

const COLOR_ESTADO: Record<TareaEstado, string> = {
  pendiente: 'border-slate-300 text-slate-700',
  en_progreso: 'border-amber-300 text-amber-800',
  hecha: 'border-green-300 text-green-800',
}

interface TareaEstadoSelectProps {
  dependenciaId: number
  tareaId: number
  estado: TareaEstado
}

export function TareaEstadoSelect({ dependenciaId, tareaId, estado }: TareaEstadoSelectProps) {
  const actualizarMutation = useActualizarEstadoTarea(dependenciaId)

  return (
    <select
      value={estado}
      onChange={(e) => actualizarMutation.mutate({ tareaId, estado: e.target.value as TareaEstado })}
      disabled={actualizarMutation.isPending}
      className={`rounded-md border bg-white px-2 py-1 text-xs font-medium focus:outline-none ${COLOR_ESTADO[estado]}`}
    >
      {(Object.keys(LABEL_ESTADO) as TareaEstado[]).map((e) => (
        <option key={e} value={e}>
          {LABEL_ESTADO[e]}
        </option>
      ))}
    </select>
  )
}
