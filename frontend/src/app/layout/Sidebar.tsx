import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { logout as authLogout } from '@/modules/auth/services/auth.service'

interface NavItem {
  to: string
  label: string
  roles?: string[]
  vendedor?: boolean
}

const navItems: NavItem[] = [
  { to: '/clientes', label: 'Clientes' },
  { to: '/productos', label: 'Productos', vendedor: true },
  { to: '/inventario', label: 'Inventario' },
  { to: '/pedidos', label: 'Pedidos', vendedor: true },
  { to: '/control-pedidos', label: 'Control Pedidos', vendedor: true },
  { to: '/remisiones', label: 'Remisiones' },
  { to: '/usuarios', label: 'Usuarios', roles: ['admin'] },
]

const LockIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
)

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const isAdmin = user?.roles?.includes('admin')
  const isVendedor = user?.roles?.includes('vendedor') && !isAdmin

  const handleLogout = async () => {
    await authLogout()
    clearAuth()
    navigate('/login', { replace: true })
  }

  const itemsToShow = isVendedor
    ? navItems.map((item) => ({
        ...item,
        blocked: !item.vendedor,
      }))
    : navItems
        .filter((item) => {
          if (item.roles) return user?.roles?.some((r) => item.roles!.includes(r))
          return true
        })
        .map((item) => ({ ...item, blocked: false }))

  return (
    <aside className="no-print flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <span className="font-semibold text-slate-900">ERP Logístico</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {itemsToShow.map((item) => {
          const blocked = 'blocked' in item && item.blocked
          if (blocked) {
            return (
              <div
                key={item.to}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600/80"
                title="Sin acceso"
              >
                <LockIcon />
                <span>{item.label}</span>
              </div>
            )
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <div className="mb-2 truncate text-sm text-slate-600">{user?.email}</div>
        <button
          onClick={handleLogout}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
