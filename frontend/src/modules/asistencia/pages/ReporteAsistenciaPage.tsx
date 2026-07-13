import { useMemo, useState } from 'react'
import { DataTable, Pagination, PageLoading } from '@/shared/components'
import { formatFechaHora } from '@/shared/utils/format'
import { useEmpleadosList } from '@/modules/empleados/hooks/useEmpleados'
import { useAsistenciaHoy, useAsistenciaReporte } from '../hooks/useAsistencia'
import { BarChart } from '../components/BarChart'
import { exportarCsv, exportarExcel } from '../utils/export'
import type { EmpleadoEstadoHoy, EventoAsistenciaReporte, TipoEvento } from '../types/asistencia.types'

const LABEL_EVENTO: Record<TipoEvento, string> = {
  ENTRY: 'Entrada',
  BREAKFAST_START: 'Inicio desayuno',
  BREAKFAST_END: 'Fin desayuno',
  LUNCH_START: 'Inicio almuerzo',
  LUNCH_END: 'Fin almuerzo',
  EXIT: 'Salida',
}

function primerDiaDelMes(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function fechaCorta(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function horaCorta(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const LIMIT = 20

export function ReporteAsistenciaPage() {
  const [empleadoId, setEmpleadoId] = useState<number | ''>('')
  const [fechaInicio, setFechaInicio] = useState(primerDiaDelMes())
  const [fechaFin, setFechaFin] = useState(hoyISO())
  const [tipoEvento, setTipoEvento] = useState<TipoEvento | ''>('')
  const [page, setPage] = useState(1)

  const { data: empleados = [] } = useEmpleadosList({ limit: 1000 })
  const { data: hoy = [], isLoading: loadingHoy } = useAsistenciaHoy()
  const { data: eventos = [], isLoading: loadingReporte } = useAsistenciaReporte({
    empleado_id: empleadoId || undefined,
    fecha_inicio: fechaInicio || undefined,
    fecha_fin: fechaFin || undefined,
    tipo_evento: tipoEvento || undefined,
  })

  const tarjetas = useMemo(() => {
    const porEstado = (estado: string) => hoy.filter((e) => e.estado === estado)
    return {
      presentes: porEstado('presente'),
      ausentes: porEstado('ausente'),
      enDesayuno: porEstado('en_desayuno'),
      enAlmuerzo: porEstado('en_almuerzo'),
      salidas: porEstado('salida'),
      entradasTardias: hoy.filter((e) => e.entrada_tardia),
    }
  }, [hoy])

  const dataPorDia = useMemo(() => {
    const entradas = eventos.filter((e) => e.tipo_evento === 'ENTRY')
    const porDia = new Map<string, number>()
    for (const e of entradas) {
      const dia = e.timestamp.slice(0, 10)
      porDia.set(dia, (porDia.get(dia) || 0) + 1)
    }
    return [...porDia.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, value]) => ({ label: fechaCorta(dia), value }))
  }, [eventos])

  const dataPorEmpleado = useMemo(() => {
    const entradas = eventos.filter((e) => e.tipo_evento === 'ENTRY')
    const porEmpleado = new Map<string, number>()
    for (const e of entradas) {
      porEmpleado.set(e.empleado_nombre, (porEmpleado.get(e.empleado_nombre) || 0) + 1)
    }
    return [...porEmpleado.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([label, value]) => ({ label, value }))
  }, [eventos])

  const columnasExport = [
    { key: 'timestamp', header: 'Fecha y hora' },
    { key: 'empleado_nombre', header: 'Empleado' },
    { key: 'cargo', header: 'Cargo' },
    { key: 'tipo_evento_label', header: 'Tipo de evento' },
    { key: 'device_id', header: 'Dispositivo' },
  ]

  const filasExport = useMemo(
    () =>
      eventos.map((e) => ({
        timestamp: formatFechaHora(e.timestamp),
        empleado_nombre: e.empleado_nombre,
        cargo: e.cargo || '',
        tipo_evento_label: LABEL_EVENTO[e.tipo_evento],
        device_id: e.device_id ?? '',
      })),
    [eventos]
  )

  const eventosPagina = eventos.slice((page - 1) * LIMIT, page * LIMIT)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Reporte de asistencia</h1>

      {/* Dashboard */}
      {loadingHoy ? (
        <PageLoading />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Tarjeta label="Presentes" empleados={tarjetas.presentes} color="text-green-700" />
          <Tarjeta label="Ausentes" empleados={tarjetas.ausentes} color="text-slate-700" />
          <Tarjeta label="En desayuno" empleados={tarjetas.enDesayuno} color="text-amber-700" />
          <Tarjeta label="En almuerzo" empleados={tarjetas.enAlmuerzo} color="text-amber-700" />
          <Tarjeta label="Salidas" empleados={tarjetas.salidas} color="text-slate-700" />
          <Tarjeta label="Entradas tardías" empleados={tarjetas.entradasTardias} color="text-red-700" mostrarHora />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Entradas por día</h2>
          <BarChart data={dataPorDia} emptyMessage="Sin entradas en el rango filtrado" />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-900">Días con entrada por empleado</h2>
          <BarChart data={dataPorEmpleado} emptyMessage="Sin entradas en el rango filtrado" />
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Empleado</label>
            <select
              value={empleadoId}
              onChange={(e) => {
                setPage(1)
                setEmpleadoId(e.target.value === '' ? '' : Number(e.target.value))
              }}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {empleados.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Fecha inicial</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setPage(1)
                setFechaInicio(e.target.value)
              }}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Fecha final</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setPage(1)
                setFechaFin(e.target.value)
              }}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700">Tipo de evento</label>
            <select
              value={tipoEvento}
              onChange={(e) => {
                setPage(1)
                setTipoEvento(e.target.value as TipoEvento | '')
              }}
              className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              {(Object.keys(LABEL_EVENTO) as TipoEvento[]).map((t) => (
                <option key={t} value={t}>
                  {LABEL_EVENTO[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              disabled={eventos.length === 0}
              onClick={() => exportarCsv(filasExport, columnasExport, 'asistencia.csv')}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Exportar CSV
            </button>
            <button
              type="button"
              disabled={eventos.length === 0}
              onClick={() => exportarExcel(filasExport, columnasExport, 'asistencia.xlsx')}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      {/* Tabla */}
      {loadingReporte ? (
        <PageLoading />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white">
          <DataTable
            columns={[
              {
                key: 'timestamp',
                header: 'Fecha y hora',
                render: (e: EventoAsistenciaReporte) => formatFechaHora(e.timestamp),
              },
              { key: 'empleado_nombre', header: 'Empleado', render: (e: EventoAsistenciaReporte) => e.empleado_nombre },
              { key: 'cargo', header: 'Cargo', render: (e: EventoAsistenciaReporte) => e.cargo || '-' },
              {
                key: 'tipo_evento',
                header: 'Tipo de evento',
                render: (e: EventoAsistenciaReporte) => LABEL_EVENTO[e.tipo_evento],
              },
              {
                key: 'device_id',
                header: 'Dispositivo',
                render: (e: EventoAsistenciaReporte) => e.device_id ?? '-',
              },
            ]}
            data={eventosPagina}
            keyExtractor={(e) => e.id}
            emptyMessage="No hay eventos en el rango filtrado"
          />
          <Pagination page={page} total={eventos.length} limit={LIMIT} onPageChange={setPage} />
        </div>
      )}
    </div>
  )
}

function Tarjeta({
  label,
  empleados,
  color,
  mostrarHora,
}: {
  label: string
  empleados: EmpleadoEstadoHoy[]
  color: string
  mostrarHora?: boolean
}) {
  const [abierto, setAbierto] = useState(false)
  const tieneDetalle = empleados.length > 0

  return (
    <div
      className="relative rounded-lg border border-slate-200 bg-white p-4"
      tabIndex={tieneDetalle ? 0 : undefined}
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
      onFocus={() => setAbierto(true)}
      onBlur={() => setAbierto(false)}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${color}`}>{empleados.length}</p>

      {abierto && tieneDetalle && (
        <div className="absolute left-0 top-full z-10 mt-1 w-60 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          <ul className="max-h-52 space-y-1 overflow-y-auto text-sm text-slate-700">
            {empleados.map((e) => (
              <li key={e.empleado_id} className="flex items-center justify-between gap-2">
                <span>{e.nombre}</span>
                {mostrarHora && e.ultima_hora && (
                  <span className="shrink-0 text-xs text-slate-400">{horaCorta(e.ultima_hora)}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
