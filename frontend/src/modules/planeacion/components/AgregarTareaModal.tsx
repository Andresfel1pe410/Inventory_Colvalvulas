import { useEffect, useState } from 'react'
import { useCrearTarea } from '../hooks/usePlaneacion'

interface AgregarTareaModalProps {
  open: boolean
  onClose: () => void
  dependenciaId: number
  empleadoId: number
  empleadoNombre: string
}

export function AgregarTareaModal({
  open,
  onClose,
  dependenciaId,
  empleadoId,
  empleadoNombre,
}: AgregarTareaModalProps) {
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState('')
  const crearMutation = useCrearTarea(dependenciaId)

  useEffect(() => {
    if (open) {
      setDescripcion('')
      setError('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!descripcion.trim()) {
      setError('La descripción de la tarea es obligatoria')
      return
    }

    try {
      await crearMutation.mutateAsync({ empleado_id: empleadoId, descripcion: descripcion.trim() })
      onClose()
    } catch (err) {
      setError((err as any)?.response?.data?.detail || 'Error al crear la tarea')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Agregar tarea</h2>
        <p className="mb-4 text-sm text-slate-500">Para {empleadoNombre}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Descripción *</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Cortar 20 láminas de referencia X"
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-600 focus:outline-none"
              disabled={crearMutation.isPending}
              autoFocus
            />
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={crearMutation.isPending}
              className="flex-1 rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-70"
            >
              {crearMutation.isPending ? 'Agregando...' : 'Agregar tarea'}
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
