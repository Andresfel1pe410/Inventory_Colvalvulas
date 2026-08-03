export type TipoEvento =
  | 'ENTRY'
  | 'BREAKFAST_START'
  | 'BREAKFAST_END'
  | 'LUNCH_START'
  | 'LUNCH_END'
  | 'EXIT'

export type EstadoHoy = 'presente' | 'ausente' | 'en_desayuno' | 'en_almuerzo' | 'salida'

export interface EventoAsistenciaReporte {
  id: number
  empleado_id: number
  empleado_nombre: string
  cargo?: string
  tipo_evento: TipoEvento
  timestamp: string
  device_id?: number
}

export interface EmpleadoEstadoHoy {
  empleado_id: number
  nombre: string
  cargo?: string
  estado: EstadoHoy
  ultimo_evento?: TipoEvento
  ultima_hora?: string
  entrada_tardia: boolean
}

export interface HorasSemanaEmpleado {
  empleado_id: number
  empleado_nombre: string
  cargo?: string
  horas_trabajadas: number
  horas_objetivo: number
  semana_inicio: string
  semana_fin: string
  dias_trabajados: number
  promedio_horas_dia: number
  promedio_desayuno_min: number
  promedio_almuerzo_min: number
}

export interface ReporteFiltros {
  empleado_id?: number
  fecha_inicio?: string
  fecha_fin?: string
  tipo_evento?: TipoEvento
}
