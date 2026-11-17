import { Navigate, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { logout as authLogout } from '@/modules/auth/services/auth.service'
import { PageLoading } from '@/shared/components'
import { useMisTareas, useActualizarMiTarea } from '../hooks/usePlaneacion'
import { TareaEstadoSelect } from '../components/TareaEstadoSelect'
import { TareaRealizadoInput } from '../components/TareaRealizadoInput'

/** Pantalla única del rol "empleado" -- sin MainLayout/Sidebar a propósito,
 * mismo patrón standalone que LoginPage/ModuleSelectPage: no hay nada más
 * que navegar para esta cuenta. */
export function MisTareasPage() {
  const user = useAuthStore((s) => s.user)
  const isEmpleado = user?.roles?.includes('empleado')
  const clearAuth = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const { data: tareas, isLoading } = useMisTareas()
  const actualizarMutation = useActualizarMiTarea()

  if (!isEmpleado) {
    return <Navigate to="/" replace />
  }

  const handleLogout = async () => {
    await authLogout()
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">Colvalvulas</p>
          <h1 className="text-xl font-semibold text-slate-900">Mis tareas</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-600 sm:inline">{user?.email}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-6">
        {isLoading ? (
          <PageLoading />
        ) : !tareas || tareas.length === 0 ? (
          <p className="text-sm text-slate-500">No tienes tareas asignadas.</p>
        ) : (
          <ul className="space-y-3">
            {tareas.map((t) => (
              <li key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400">{t.dependencia_nombre}</p>
                <p className="mt-1 text-sm text-slate-800">{t.descripcion}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <TareaEstadoSelect
                    estado={t.estado}
                    disabled={actualizarMutation.isPending}
                    onChange={(estado) => actualizarMutation.mutate({ tareaId: t.id, estado })}
                  />
                  <TareaRealizadoInput
                    cantidad={t.cantidad}
                    realizado={t.realizado}
                    disabled={actualizarMutation.isPending}
                    onCommit={(realizado) =>
                      actualizarMutation.mutate({ tareaId: t.id, estado: t.estado, realizado })
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
