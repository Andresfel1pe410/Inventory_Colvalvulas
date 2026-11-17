import { useState } from 'react'
import { useEmpleadosList } from '@/modules/empleados/hooks/useEmpleados'
import { useAgregarEmpleado } from '../hooks/usePlaneacion'

interface AgregarEmpleadoControlProps {
  dependenciaId: number
  empleadoIdsAsignados: number[]
}

export function AgregarEmpleadoControl({ dependenciaId, empleadoIdsAsignados }: AgregarEmpleadoControlProps) {
  const [empleadoId, setEmpleadoId] = useState('')
  const { data: empleados = [] } = useEmpleadosList({ limit: 1000 })
  const agregarMutation = useAgregarEmpleado(dependenciaId)

  const disponibles = empleados.filter((e) => e.activo && !empleadoIdsAsignados.includes(e.id))

  const handleAgregar = async () => {
    if (!empleadoId) return
    await agregarMutation.mutateAsync(Number(empleadoId))
    setEmpleadoId('')
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={empleadoId}
        onChange={(e) => setEmpleadoId(e.target.value)}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-primary-600 focus:outline-none"
        disabled={agregarMutation.isPending}
      >
        <option value="">Seleccionar empleado...</option>
        {disponibles.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.nombre}
            {emp.cargo ? ` (${emp.cargo})` : ''}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAgregar}
        disabled={!empleadoId || agregarMutation.isPending}
        className="rounded-md bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {agregarMutation.isPending ? 'Agregando...' : 'Agregar empleado'}
      </button>
    </div>
  )
}
