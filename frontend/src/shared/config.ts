/**
 * URL base de la API.
 * En desarrollo: usa ruta relativa (Vite proxy redirige a localhost:8000).
 * En producción: usa VITE_API_URL (ej. https://tu-backend.railway.app).
 */
export const API_BASE =
  import.meta.env.VITE_API_URL != null && import.meta.env.VITE_API_URL !== ''
    ? `${String(import.meta.env.VITE_API_URL).replace(/\/$/, '')}/api/v1`
    : '/api/v1'
