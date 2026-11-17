import { useEffect, useState } from 'react'
import { RootApp } from '@/apps/root/RootApp'
import { supabase, fetchMe, logout } from '@/modules/auth/services/auth.service'
import { useAuthStore } from '@/modules/auth/store/authStore'
import {
  useIdleLogout,
  TIEMPO_INACTIVIDAD_MS,
  STORAGE_LAST_ACTIVITY_KEY,
} from '@/modules/auth'
import { PageLoading } from '@/shared/components'

export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  useIdleLogout()

  useEffect(() => {
    let activo = true
    ;(async () => {
      // Verificar si hubo inactividad mayor a 10 minutos mientras la pestaña estuvo cerrada o antes de recargar
      const guardado = localStorage.getItem(STORAGE_LAST_ACTIVITY_KEY)
      if (guardado) {
        const transcurrido = Date.now() - Number(guardado)
        if (transcurrido >= TIEMPO_INACTIVIDAD_MS) {
          sessionStorage.setItem('erp_sesion_expirada', '1')
          await logout()
          if (activo) setBootstrapped(true)
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (token) {
        try {
          const user = await fetchMe(token)
          if (activo) {
            localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, String(Date.now()))
            setAuth(user, token)
          }
        } catch {
          // token vencido/inválido: sigue sin sesión, ProtectedRoute manda a /login
          localStorage.removeItem(STORAGE_LAST_ACTIVITY_KEY)
        }
      }
      if (activo) setBootstrapped(true)
    })()
    return () => {
      activo = false
    }
  }, [setAuth])

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoading />
      </div>
    )
  }

  return <RootApp />
}
