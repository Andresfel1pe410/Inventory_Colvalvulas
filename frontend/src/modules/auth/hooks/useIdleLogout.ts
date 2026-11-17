import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { logout as authLogout } from '../services/auth.service'

export const TIEMPO_INACTIVIDAD_MS = 10 * 60 * 1000 // 10 minutos
export const STORAGE_LAST_ACTIVITY_KEY = 'erp_last_activity'

const EVENTOS_ACTIVIDAD = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click',
] as const

/**
 * Cierra la sesión automáticamente tras 10 minutos sin actividad del usuario
 * (mouse, teclado, scroll, touch, cambios de ventana o recargas).
 * Sincronizado a través de localStorage para soportar múltiples pestañas
 * y evitar que se quede iniciada indefinidamente.
 */
export function useIdleLogout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const clearAuth = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const ultimoRegistroRef = useRef<number>(Date.now())
  const loggingOutRef = useRef<boolean>(false)

  const cerrarPorInactividad = useCallback(() => {
    if (loggingOutRef.current) return
    loggingOutRef.current = true
    localStorage.removeItem(STORAGE_LAST_ACTIVITY_KEY)
    sessionStorage.setItem('erp_sesion_expirada', '1')
    authLogout().finally(() => {
      clearAuth()
      loggingOutRef.current = false
      navigate('/login', { replace: true, state: { sesionExpirada: true } })
    })
  }, [clearAuth, navigate])

  useEffect(() => {
    if (!isAuthenticated) return

    loggingOutRef.current = false

    const ahora = Date.now()
    const guardado = localStorage.getItem(STORAGE_LAST_ACTIVITY_KEY)
    if (!guardado) {
      localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, String(ahora))
      ultimoRegistroRef.current = ahora
    } else if (ahora - Number(guardado) >= TIEMPO_INACTIVIDAD_MS) {
      cerrarPorInactividad()
      return
    } else {
      ultimoRegistroRef.current = Number(guardado)
    }

    const registrarActividad = () => {
      const timestampActual = Date.now()
      const ultimo = Number(localStorage.getItem(STORAGE_LAST_ACTIVITY_KEY) || timestampActual)

      // Si ya transcurrieron los 10 minutos de inactividad, cerrar sesión de inmediato
      if (timestampActual - ultimo >= TIEMPO_INACTIVIDAD_MS) {
        cerrarPorInactividad()
        return
      }

      // Throttle: registrar en localStorage como máximo cada 3 segundos para no saturar I/O
      if (timestampActual - ultimoRegistroRef.current > 3000) {
        ultimoRegistroRef.current = timestampActual
        localStorage.setItem(STORAGE_LAST_ACTIVITY_KEY, String(timestampActual))
      }
    }

    // Intervalo de chequeo periódico cada 5 segundos para pestañas abiertas sin interacción
    const intervalo = setInterval(() => {
      const timestampActual = Date.now()
      const ultimo = Number(localStorage.getItem(STORAGE_LAST_ACTIVITY_KEY) || timestampActual)
      if (timestampActual - ultimo >= TIEMPO_INACTIVIDAD_MS) {
        cerrarPorInactividad()
      }
    }, 5000)

    // Chequear al reenfocar la ventana o cambiar de pestaña
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        registrarActividad()
      }
    }

    // Sincronización entre pestañas abiertas
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_LAST_ACTIVITY_KEY && e.newValue) {
        ultimoRegistroRef.current = Number(e.newValue)
      } else if (e.key === 'erp-auth' && !e.newValue) {
        clearAuth()
        navigate('/login', { replace: true })
      }
    }

    EVENTOS_ACTIVIDAD.forEach((evento) =>
      window.addEventListener(evento, registrarActividad, { passive: true })
    )
    window.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)
    window.addEventListener('storage', onStorage)

    return () => {
      clearInterval(intervalo)
      EVENTOS_ACTIVIDAD.forEach((evento) =>
        window.removeEventListener(evento, registrarActividad)
      )
      window.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [isAuthenticated, cerrarPorInactividad, clearAuth, navigate])
}
