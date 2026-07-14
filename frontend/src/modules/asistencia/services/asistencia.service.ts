import { rrhhApi } from '@/shared/services/api'
import type {
  EmpleadoEstadoHoy,
  EventoAsistenciaReporte,
  HorasSemanaEmpleado,
  ReporteFiltros,
} from '../types/asistencia.types'

export const asistenciaService = {
  hoy: () => rrhhApi.get<EmpleadoEstadoHoy[]>('/asistencia/hoy').then((r) => r.data),

  horasSemana: () => rrhhApi.get<HorasSemanaEmpleado[]>('/asistencia/horas-semana').then((r) => r.data),

  reporte: (filtros?: ReporteFiltros) =>
    rrhhApi
      .get<EventoAsistenciaReporte[]>('/asistencia/reporte', {
        params: {
          empleado_id: filtros?.empleado_id,
          fecha_inicio: filtros?.fecha_inicio,
          fecha_fin: filtros?.fecha_fin,
          tipo_evento: filtros?.tipo_evento,
          limit: 5000,
        },
      })
      .then((r) => r.data),
}
