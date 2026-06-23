import axios from 'axios'
import { createClient, Session } from '@supabase/supabase-js'
import { User } from '../types/auth.types'
import { AUTH_API_BASE } from '@/shared/config'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const memoryStorage: Record<string, string> = {}

const customStorage = {
  getItem: (key: string) => memoryStorage[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStorage[key] = value
  },
  removeItem: (key: string) => {
    delete memoryStorage[key]
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    storageKey: 'erp-auth',
    persistSession: false,
  },
})

export interface MeResponse {
  id: number
  email: string
  nombre: string | null
  apellido: string | null
  roles: string[]
  listas_precio: string[] | null
}

export async function fetchMe(token: string): Promise<User> {
  try {
    const { data } = await axios.get<MeResponse>(`${AUTH_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return {
      id: String(data.id),
      email: data.email,
      nombre: data.nombre ?? undefined,
      apellido: data.apellido ?? undefined,
      roles: data.roles,
      listas_precio: data.listas_precio,
    }
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      const detail = (err.response?.data as { detail?: string })?.detail
      if (detail?.includes('no encontrado') || detail?.includes('Usuario no encontrado')) {
        throw new Error(
          'Usuario no encontrado en la base de datos. Ejecute el SQL en MIGRACION_USUARIO.md (Supabase SQL Editor) para crear su usuario.'
        )
      }
      if (detail === 'Token expirado') {
        throw new Error('Sesión expirada. Intente iniciar sesión de nuevo.')
      }
      if (detail?.includes('inválido') || detail?.includes('Token inválido')) {
        throw new Error(detail || 'El backend rechazó el token.')
      }
      // Diagnóstico: llamar al endpoint de debug para obtener causa exacta
      try {
        const res = await axios.get<{ step?: string; error?: string; hint?: string }>(
          `${AUTH_API_BASE}/debug/auth`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const d = res.data
        if (d.step === 'usuario_not_found') {
          throw new Error(
            'Usuario no encontrado en la BD. Si funciona en producción, el backend local puede usar otra base de datos. Verifica que el .env en la raíz del proyecto tenga el mismo DATABASE_URL que en Railway/producción.'
          )
        }
        if (d.step === 'token_invalid') {
          throw new Error(
            `Token rechazado: ${d.error}. Verifica SUPABASE_URL y SUPABASE_JWT_SECRET en .env del backend (raíz del proyecto).`
          )
        }
      } catch (debugErr) {
        if (debugErr instanceof Error && !axios.isAxiosError(debugErr)) throw debugErr
      }
    }
    throw err
  }
}

export async function login(email: string, password: string): Promise<{ session: Session; user: User }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  if (!data.session) throw new Error('No se obtuvo sesión')

  const token = data.session.access_token
  const user = await fetchMe(token)

  return { session: data.session, user }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}
