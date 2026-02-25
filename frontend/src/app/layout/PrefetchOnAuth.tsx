import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/query/queryKeys'
import { clienteService } from '@/modules/clientes/services/cliente.service'
import { productoService } from '@/modules/productos/services/producto.service'

/**
 * Prefetch de clientes y productos al cargar la app (usuario autenticado).
 * Así los datos están en caché cuando el usuario navega a pedidos, formularios, etc.
 * Funciona para todos los roles (vendedor necesita clientes para crear pedidos aunque no tenga pestaña Clientes).
 */
export function PrefetchOnAuth() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const prefetch = async () => {
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: queryKeys.clientes.list({ limit: 500 }),
          queryFn: () =>
            clienteService.list({
              skip: 0,
              limit: 500,
            }),
        }),
        queryClient.prefetchQuery({
          queryKey: queryKeys.productos.list({ limit: 500 }),
          queryFn: () =>
            productoService.list({
              skip: 0,
              limit: 500,
            }),
        }),
      ])
    }
    prefetch()
  }, [queryClient])

  return null
}
