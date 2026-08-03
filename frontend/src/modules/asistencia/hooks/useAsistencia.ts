import { useQuery } from '@tanstack/react-query'
import { asistenciaService } from '../services/asistencia.service'
import { queryKeys } from '@/shared/query/queryKeys'
import type { ReporteFiltros } from '../types/asistencia.types'

export function useAsistenciaHoy() {
  return useQuery({
    queryKey: queryKeys.asistencia.hoy,
    queryFn: () => asistenciaService.hoy(),
    refetchInterval: 60_000,
  })
}

export function useHorasSemana(semanaInicio?: string) {
  return useQuery({
    queryKey: queryKeys.asistencia.horasSemana(semanaInicio),
    queryFn: () => asistenciaService.horasSemana(semanaInicio),
    refetchInterval: 60_000,
  })
}

export function useAsistenciaReporte(filtros: ReporteFiltros) {
  return useQuery({
    queryKey: queryKeys.asistencia.reporte({
      empleadoId: filtros.empleado_id,
      fechaInicio: filtros.fecha_inicio,
      fechaFin: filtros.fecha_fin,
      tipoEvento: filtros.tipo_evento,
    }),
    queryFn: () => asistenciaService.reporte(filtros),
  })
}
