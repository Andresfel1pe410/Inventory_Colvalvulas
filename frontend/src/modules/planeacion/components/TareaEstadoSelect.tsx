import type { TareaEstado } from '../types/planeacion.types'

export const LABEL_ESTADO: Record<TareaEstado, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  hecha: 'Hecha',
}

export const COLOR_ESTADO: Record<TareaEstado, string> = {
  pendiente: 'border-slate-300 text-slate-700',
  en_progreso: 'border-amber-300 text-amber-800',
  hecha: 'border-green-300 text-green-800',
}

interface TareaEstadoSelectProps {
  estado: TareaEstado
  onChange: (estado: TareaEstado) => void
  disabled?: boolean
}

/** Componente "tonto": no sabe de qué dependencia es ni cómo se guarda el
 * cambio -- así lo puede usar tanto la vista admin (por dependencia) como
 * la del empleado ("mis tareas", sin dependencia_id). */
export function TareaEstadoSelect({ estado, onChange, disabled }: TareaEstadoSelectProps) {
  return (
    <select
      value={estado}
      onChange={(e) => onChange(e.target.value as TareaEstado)}
      disabled={disabled}
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
