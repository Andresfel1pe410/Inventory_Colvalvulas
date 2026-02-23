import { QueryClient } from '@tanstack/react-query'

/** Tiempo que los datos se consideran "frescos" (stale-while-revalidate) */
const STALE_TIME_MS = 2 * 60 * 1000 // 2 minutos para listas maestras

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      gcTime: 5 * 60 * 1000, // 5 min en cache (antes cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
