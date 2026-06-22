import { useState } from 'react'
import { DataTable, Column } from '@/shared/components'
import type { InventarioProceso } from '../types/inventario-proceso.types'
import { EntradaSalidaProcesoModal } from './EntradaSalidaProcesoModal'

interface InventarioProcesoTableProps {
  data: InventarioProceso[]
  isRefreshing: boolean
  onRefresh: () => void
  onMovimientoCreated: () => void
}

export function InventarioProcesoTable({
  data,
  isRefreshing,
  onRefresh,
  onMovimientoCreated,
}: InventarioProcesoTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [tipoModal, setTipoModal] = useState<'entrada' | 'salida'>('entrada')
  const [itemSeleccionado, setItemSeleccionado] = useState<InventarioProceso | null>(null)

  const handleEntrada = (inv: InventarioProceso) => {
    setItemSeleccionado(inv)
    setTipoModal('entrada')
    setModalOpen(true)
  }

  const handleSalida = (inv: InventarioProceso) => {
    setItemSeleccionado(inv)
    setTipoModal('salida')
    setModalOpen(true)
  }

  const handleNuevaEntrada = () => {
    setItemSeleccionado(null)
    setTipoModal('entrada')
    setModalOpen(true)
  }

  // 👇 ORDENAMIENTO ALFABÉTICO POR REFERENCIA
  // Creamos una copia del array con [...data] para no mutar las props originales
  const sortedData = [...data].sort((a, b) => 
    a.referencia.localeCompare(b.referencia, undefined, { numeric: true, sensitivity: 'base' })
  )

  const columns: Column<InventarioProceso>[] = [
    { key: 'referencia', header: 'Referencia' },
    { key: 'material', header: 'Material' },
    {
      key: 'cantidad',
      header: 'Cantidad',
      render: (i) => (
        <span className={i.cantidad < 0 ? 'font-medium text-red-600' : 'font-medium'}>
          {i.cantidad}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (i) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEntrada(i)}
            className="rounded-md bg-green-50 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-100"
          >
            Entrada
          </button>
          <button
            onClick={() => handleSalida(i)}
            className="rounded-md bg-red-50 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-100"
          >
            Salida
          </button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-900">Inventario de Proceso</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Actualizar"
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isRefreshing ? (
              <span
                className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-primary-600"
                aria-hidden="true"
              />
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleNuevaEntrada}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Nueva Entrada
          </button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sortedData} // 👈 Cambiado 'data' por 'sortedData'
        keyExtractor={(item) => item.id}
        emptyMessage="No hay productos en inventario de proceso"
      />

      <EntradaSalidaProcesoModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setItemSeleccionado(null)
        }}
        onCreated={() => {
          setModalOpen(false)
          setItemSeleccionado(null)
          onMovimientoCreated()
        }}
        tipo={tipoModal}
        item={itemSeleccionado}
      />
    </div>
  )
}