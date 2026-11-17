import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { logout as authLogout } from '../services/auth.service'

const TIEMPO_INACTIVIDAD_MS = 15 * 60 * 1000
const EVENTOS_ACTIVIDAD = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'] as const

/** Cierra la sesión automáticamente tras 15 minutos sin actividad del
 * usuario (mouse, teclado, scroll, touch) -- antes la sesión quedaba
 * iniciada indefinidamente. Solo corre mientras hay sesión activa. */
export function useIdleLogout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const clearAuth = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return

    const cerrarPorInactividad = () => {
      authLogout().finally(() => {
        clearAuth()
        navigate('/login', { replace: true, state: { sesionExpirada: true } })
      })
    }

    const reiniciarTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(cerrarPorInactividad, TIEMPO_INACTIVIDAD_MS)
    }

    reiniciarTimer()
    EVENTOS_ACTIVIDAD.forEach((evento) => window.addEventListener(evento, reiniciarTimer))

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      EVENTOS_ACTIVIDAD.forEach((evento) => window.removeEventListener(evento, reiniciarTimer))
    }
  }, [isAuthenticated, clearAuth, navigate])
}
