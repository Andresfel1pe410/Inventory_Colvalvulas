export interface User {
  id: string
  email: string
  nombre?: string
  apellido?: string
  roles: string[]
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}
