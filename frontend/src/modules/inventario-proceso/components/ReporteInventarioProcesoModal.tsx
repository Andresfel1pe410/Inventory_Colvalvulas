import { useMemo } from 'react'
import { DataTable } from '@/shared/components'
import { useInventarioProcesoMovimientos } from '../hooks/useInventarioProceso'
import type { MovimientoInventarioProceso } from '../types/inventario-proceso.types'

interface ReporteInventarioProcesoModalProps {
  open: boolean
  onClose: () => void
}

function etiquetaTipo(tipo: 'entrada' | 'salida') {
  return tipo === 'entrada' ? 'Entrada' : 'Salida'
}

function colorTipo(tipo: 'entrada' | 'salida') {
  return tipo === 'entrada'
    ? 'bg-green-100 text-green-800 border-green-300'
    : 'bg-rose-100 text-rose-800 border-rose-300'
}

export function ReporteInventarioProcesoModal({ open, onClose }: ReporteInventarioProcesoModalProps) {
  const { data: movimientos = [], isLoading, isFetching, refetch } = useInventarioProcesoMovimientos({
    enabled: open,
  })

  const sortedMovimientos = useMemo(
    () => [...movimientos].sort((a, b) => b.id - a.id),
    [movimientos],
  )

  if (!open) return null

  const columns = [
    {
      key: 'created_at',
      header: 'Fecha',
      width: '170px',
      render: (m: MovimientoInventarioProceso) =>
        new Date(m.created_at).toLocaleString('es-CO', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      width: '110px',
      render: (m: MovimientoInventarioProceso) => (
        <span className={`rounded-full border px-2 py-1 text-xs font-medium ${colorTipo(m.tipo)}`}>
          {etiquetaTipo(m.tipo)}
        </span>
      ),
    },
    { key: 'referencia', header: 'Referencia', render: (m: MovimientoInventarioProceso) => m.referencia },
    { key: 'material', header: 'Material', render: (m: MovimientoInventarioProceso) => m.material },
    {
      key: 'cantidad',
      header: 'Cantidad',
      width: '100px',
      render: (m: MovimientoInventarioProceso) => m.cantidad.toLocaleString('es-CO'),
    },
    {
      key: 'usuario_realizo',
      header: 'Realizado por',
      render: (m: MovimientoInventarioProceso) => m.usuario_realizo,
    },
    {
      key: 'registrada_por',
      header: 'Registrada por',
      render: (m: MovimientoInventarioProceso) => m.registrada_por,
    },
    {
      key: 'cantidad_anterior',
      header: 'Anterior',
      width: '90px',
      render: (m: MovimientoInventarioProceso) => m.cantidad_anterior.toLocaleString('es-CO'),
    },
    {
      key: 'cantidad_nueva',
      header: 'Nueva',
      width: '90px',
      render: (m: MovimientoInventarioProceso) => m.cantidad_nueva.toLocaleString('es-CO'),
    },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-7xl flex-col rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Reporte de inventario de proceso</h2>
            <p className="text-sm text-slate-500">Entradas y salidas registradas en el sistema</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isFetching ? 'Actualizando...' : 'Actualizar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {isLoading ? (
            <div className="py-10 text-center text-slate-500">Cargando reporte...</div>
          ) : (
            <DataTable
              columns={columns}
              data={sortedMovimientos}
              keyExtractor={(item) => item.id}
              emptyMessage="No hay movimientos registrados"
            />
          )}
        </div>
      </div>
    </div>
  )
}