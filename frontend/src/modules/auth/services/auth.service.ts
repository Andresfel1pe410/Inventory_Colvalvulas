import { createClient, Session } from '@supabase/supabase-js'
import { User } from '../types/auth.types'

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

export async function login(email: string, password: string): Promise<{ session: Session; user: User }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  if (!data.session) throw new Error('No se obtuvo sesión')

  const user: User = {
    id: data.user.id,
    email: data.user.email!,
    nombre: data.user.user_metadata?.nombre,
    apellido: data.user.user_metadata?.apellido,
    roles: data.user.user_metadata?.roles || ['vendedor'],
  }

  return { session: data.session, user }
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut()
}
