import { useEffect, useState } from 'react'
import { useEmpleadosList } from '@/modules/empleados/hooks/useEmpleados'
import { useDependenciaCreate } from '../hooks/usePlaneacion'

interface CrearDependenciaModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CrearDependenciaModal({ open, onClose, onCreated }: CrearDependenciaModalProps) {
  const [nombre, setNombre] = useState('')
  const [empleadoIds, setEmpleadoIds] = useState<number[]>([])
  const [error, setError] = useState('')

  const { data: empleados = [] } = useEmpleadosList({ limit: 1000 })
  const empleadosActivos = empleados.filter((e) => e.activo)
  const crearMutation = useDependenciaCreate()

  useEffect(() => {
    if (open) {
      setNombre('')
      setEmpleadoIds([])
      setError('')
    }
  }, [open])

  const toggleEmpleado = (id: number) => {
    setEmpleadoIds((cur) => (cur.includes(id) ? cur.filter((e) => e !== id) : [...cur, id]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nombre.trim()) {
      setError('El nombre de la dependencia es obligatorio')
      return
    }

    try {
      await crearMutation.mutateAsync({ nombre: nombre.trim(), empleado_ids: empleadoIds })
      onCreated()
    } catch (err) {
      setError((err as any)?.response?.data?.detail || 'Error al crear la dependencia')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Crear dependencia</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Corte y Soldadura"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-600 focus:outline-none"
              disabled={crearMutation.isPending}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Empleados asignados</label>
            <div className="mt-1 max-h-52 overflow-y-auto rounded-md border border-slate-300 p-2">
              {empleadosActivos.length === 0 ? (
                <p className="p-2 text-sm text-slate-500">No hay empleados activos</p>
              ) : (
                empleadosActivos.map((emp) => (
                  <label key={emp.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={empleadoIds.includes(emp.id)}
                      onChange={() => toggleEmpleado(emp.id)}
                      disabled={crearMutation.isPending}
                    />
                    <span className="text-sm text-slate-900">{emp.nombre}</span>
                    {emp.cargo && <span className="text-xs text-slate-500">({emp.cargo})</span>}
                  </label>
                ))
              )}
            </div>
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={crearMutation.isPending}
              className="flex-1 rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-70"
            >
              {crearMutation.isPending ? 'Creando...' : 'Crear dependencia'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={crearMutation.isPending}
              className="flex-1 rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
