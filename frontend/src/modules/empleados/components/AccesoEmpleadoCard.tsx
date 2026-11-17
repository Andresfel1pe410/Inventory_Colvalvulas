import { useState } from 'react'
import { useEmpleadoAcceso, useCrearAcceso } from '../hooks/useEmpleadoAcceso'

/** Tarjeta para que el admin le cree a un empleado ya existente su acceso
 * de login (correo + clave temporal) a "Planeación → Mis tareas". Cambiar
 * o resetear la clave de un acceso ya creado queda fuera de este alcance. */
export function AccesoEmpleadoCard({ empleadoId }: { empleadoId: number }) {
  const { data: acceso, isLoading } = useEmpleadoAcceso(empleadoId)
  const crearMutation = useCrearAcceso(empleadoId)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('El correo es obligatorio')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    try {
      await crearMutation.mutateAsync({ email: email.trim(), password })
    } catch (err) {
      setError((err as any)?.response?.data?.detail || 'Error al crear el acceso')
    }
  }

  return (
    <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-medium text-slate-900">Acceso al sistema</h2>
      <p className="mt-1 text-xs text-slate-500">
        Con esto el empleado puede entrar con su correo y clave a ver y actualizar sus tareas de Planeación.
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-slate-500">Cargando...</p>
      ) : acceso?.tiene_acceso ? (
        <p className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
          Ya tiene acceso ({acceso.email})
        </p>
      ) : (
        <form onSubmit={handleCrear} className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Correo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={crearMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Clave temporal</label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                disabled={crearMutation.isPending}
              />
            </div>
          </div>
          {error && <div className="rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</div>}
          <button
            type="submit"
            disabled={crearMutation.isPending}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {crearMutation.isPending ? 'Creando...' : 'Crear acceso'}
          </button>
        </form>
      )}
    </div>
  )
}
