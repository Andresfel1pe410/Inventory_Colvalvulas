export interface User {
  id: string
  email: string
  nombre?: string
  apellido?: string
  roles: string[]
  listas_precio?: string[] | null  // Solo vendedor: listas asignadas; null = admin (todas)
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}
