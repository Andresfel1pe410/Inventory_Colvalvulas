export interface UsuarioSistema {
  id: number
  email: string
  nombre?: string
  apellido?: string
  activo: boolean
  roles: string[]
  listas_precio?: string[]
}
