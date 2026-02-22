import { api } from '@/shared/services/api'
import type { UsuarioSistema } from '../types/usuario.types'

export interface Rol {
  id: number
  nombre: string
  descripcion?: string
}

export const usuarioService = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get<UsuarioSistema[]>('/usuarios', { params }).then((r) => r.data).catch(() => []),
  asignarListas: (usuarioId: number, listas: string[]) =>
    api.put(`/usuarios/${usuarioId}/listas`, { listas }).then((r) => r.data),
  setRoles: (usuarioId: number, rolIds: number[]) =>
    api.put(`/usuarios/${usuarioId}/roles`, { rol_ids: rolIds }).then((r) => r.data),
  getRoles: () => api.get<Rol[]>('/roles').then((r) => r.data).catch(() => []),
}
