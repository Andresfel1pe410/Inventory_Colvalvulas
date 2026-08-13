import { useEffect, useState } from 'react'
import { RootApp } from '@/apps/root/RootApp'
import { supabase, fetchMe } from '@/modules/auth/services/auth.service'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { PageLoading } from '@/shared/components'

export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (token) {
        try {
          const user = await fetchMe(token)
          if (activo) setAuth(user, token)
        } catch {
          // token vencido/inválido: sigue sin sesión, ProtectedRoute manda a /login
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
