import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { logout as authLogout } from '@/modules/auth/services/auth.service'

interface NavItem {
  to: string
  label: string
  roles?: string[]
}

const navItems: NavItem[] = [
  { to: '/clientes', label: 'Clientes' },
  { to: '/productos', label: 'Productos' },
  { to: '/inventario', label: 'Inventario' },
  { to: '/pedidos', label: 'Pedidos' },
  { to: '/control-pedidos', label: 'Control Pedidos' },
  { to: '/remisiones', label: 'Remisiones' },
  { to: '/usuarios', label: 'Usuarios', roles: ['admin'] },
]

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const handleLogout = async () => {
    await authLogout()
    clearAuth()
    navigate('/login', { replace: true })
  }

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true
    return user?.roles?.some((r) => item.roles!.includes(r))
  })

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        <span className="font-semibold text-slate-900">ERP Logístico</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {filteredItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `block rounded-md px-3 py-2 text-sm font-medium ${
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
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
