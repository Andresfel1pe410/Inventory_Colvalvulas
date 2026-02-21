import { api } from '@/shared/services/api'
import type { UsuarioSistema } from '../types/usuario.types'

export const usuarioService = {
  list: (params?: { skip?: number; limit?: number }) =>
    api.get<UsuarioSistema[]>('/usuarios', { params }).then((r) => r.data).catch(() => []),
}
