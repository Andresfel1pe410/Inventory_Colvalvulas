import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface RoleGuardProps {
  children: React.ReactNode
  requireAdmin?: boolean
  allowedRoles?: string[] // Roles permitidos además de admin
}

/** 
 * Redirige si el usuario no tiene los permisos necesarios.
 * - requireAdmin: Redirige a /pedidos si no es admin
 * - allowedRoles: Redirige a /pedidos si no tiene ninguno de estos roles
 */
export function RoleGuard({ children, requireAdmin, allowedRoles }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.roles?.includes('admin')
  
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/pedidos" replace />
  }
  
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = user?.roles?.some((r) => allowedRoles.includes(r))
    if (!hasRole) {
      return <Navigate to="/pedidos" replace />
    }
  }

  return <>{children}</>
}
