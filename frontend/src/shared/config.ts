/**
 * URL base de las APIs.
 * En desarrollo: usa ruta relativa (Vite proxy redirige a localhost:8000).
 * En producción: usa VITE_API_URL (ej. https://tu-backend.railway.app).
 */
const API_ROOT =
  import.meta.env.VITE_API_URL != null && import.meta.env.VITE_API_URL !== ''
    ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/api/v1`
    : '/api/v1'

export const AUTH_API_BASE = `${API_ROOT}/auth`
export const VENTAS_API_BASE = `${API_ROOT}/ventas`
export const PROCESO_API_BASE = `${API_ROOT}/proceso`
export const API_BASE = VENTAS_API_BASE
