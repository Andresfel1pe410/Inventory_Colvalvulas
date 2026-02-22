import axios from 'axios'
import { createClient, Session } from '@supabase/supabase-js'
import { User } from '../types/auth.types'
import { API_BASE } from '@/shared/config'

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
  const { data } = await axios.get<MeResponse>(`${API_BASE}/auth/me`, {
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
