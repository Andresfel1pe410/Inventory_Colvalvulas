import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usuarioService } from '../services/usuario.service'
import { queryKeys } from '@/shared/query/queryKeys'

export function useUsuariosList(params?: { skip?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.usuarios.list(params),
    queryFn: () => usuarioService.list(params ?? {}),
  })
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.usuarios.roles,
    queryFn: () => usuarioService.getRoles(),
  })
}

export function useUsuarioSetRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ usuarioId, rolIds }: { usuarioId: number; rolIds: number[] }) =>
      usuarioService.setRoles(usuarioId, rolIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.usuarios.all }),
  })
}

export function useUsuarioAsignarListas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      usuarioId,
      listas,
    }: {
      usuarioId: number
      listas: string[]
    }) => usuarioService.asignarListas(usuarioId, listas),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.usuarios.all }),
  })
}
