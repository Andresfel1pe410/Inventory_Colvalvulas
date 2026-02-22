import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface RoleGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

/** Redirige a vendedor si la ruta requiere admin. */
export function RoleGuard({ children, requireAdmin }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.roles?.includes('admin')

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/pedidos" replace />
  }

  return <>{children}</>
}
