import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEmpleado, useEmpleadoCreate, useEmpleadoUpdate } from '../hooks/useEmpleados'
import { AccesoEmpleadoCard } from '../components/AccesoEmpleadoCard'
import { PageLoading } from '@/shared/components'
import { useSectionPath } from '@/app/routing/sectionPath'
import type { EmpleadoCreate } from '../types/empleado.types'

export function EmpleadoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const sectionPath = useSectionPath()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<EmpleadoCreate>({
    nombre: '',
    documento: '',
    cargo: '',
    telefono: '',
    activo: true,
    fingerprint_id: undefined,
    solo_entrada_salida: false,
  })
  const [error, setError] = useState('')

  const { data: empleado, isLoading: loadingEmpleado } = useEmpleado(isEdit && id ? Number(id) : null)
  const createMutation = useEmpleadoCreate()
  const updateMutation = useEmpleadoUpdate()

  useEffect(() => {
    if (empleado) {
      setForm({
        nombre: empleado.nombre || '',
        documento: empleado.documento || '',
        cargo: empleado.cargo || '',
        telefono: empleado.telefono || '',
        activo: empleado.activo,
        fingerprint_id: empleado.fingerprint_id,
        solo_entrada_salida: empleado.solo_entrada_salida,
      })
    }
  }, [empleado])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const data: EmpleadoCreate = {
      ...form,
      cargo: form.cargo || undefined,
      telefono: form.telefono || undefined,
      fingerprint_id:
        form.fingerprint_id === undefined || Number.isNaN(form.fingerprint_id)
          ? undefined
          : form.fingerprint_id,
    }
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id: Number(id), data })
      } else {
        await createMutation.mutateAsync(data)
      }
      navigate(sectionPath('/empleados'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingEmpleado) {
    return <PageLoading />
  }

  if (isEdit && id && !loadingEmpleado && !empleado) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
        Empleado no encontrado
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate(sectionPath('/empleados'))}
            className="text-primary-600 hover:underline"
          >
            Volver a empleados
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        {isEdit ? 'Editar empleado' : 'Nuevo empleado'}
      </h1>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-slate-700">Nombre *</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Documento *</label>
            <input
              type="text"
              value={form.documento}
              onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Cargo</label>
            <input
              type="text"
              value={form.cargo}
              onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Fingerprint ID (sensor AS608)
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.fingerprint_id ?? ''}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '')
                setForm((f) => ({ ...f, fingerprint_id: v === '' ? undefined : parseInt(v, 10) }))
              }}
              placeholder="Ej: 15"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.activo ?? true}
              onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Activo
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.solo_entrada_salida ?? false}
              onChange={(e) => setForm((f) => ({ ...f, solo_entrada_salida: e.target.checked }))}
              className="rounded border-slate-300"
            />
            Solo Entrada/Salida (gerente, jefe de almacén)
          </label>
          <p className="text-xs text-slate-500">
            Si está marcado, el sensor de asistencia solo le registra entrada y
            salida — sin desayuno ni almuerzo.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => navigate(sectionPath('/empleados'))}
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </form>

      {isEdit && empleado && (
        <div className="mt-6 max-w-xl">
          <AccesoEmpleadoCard empleadoId={empleado.id} />
        </div>
      )}
    </div>
  )
}
