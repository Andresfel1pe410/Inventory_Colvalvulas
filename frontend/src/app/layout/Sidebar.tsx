import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useIsFetching } from '@tanstack/react-query'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { logout as authLogout } from '@/modules/auth/services/auth.service'

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed'

interface NavItem {
  to: string
  label: string
  roles?: string[] // Roles que tienen acceso (undefined = todos excepto vendedor)
  vendedor?: boolean // Si está disponible para vendedor
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { to: '/clientes', label: 'Clientes', roles: ['admin'], icon: <ClientsIcon /> },
  { to: '/productos', label: 'Productos', vendedor: true, icon: <ProductsIcon /> },
  { to: '/inventario', label: 'Inventario', roles: ['admin', 'almacen'], icon: <InventoryIcon /> },
  { to: '/pedidos', label: 'Pedidos', vendedor: true, icon: <OrdersIcon /> },
  { to: '/control-pedidos', label: 'Control Pedidos', vendedor: true, icon: <ControlIcon /> },
  { to: '/graficas', label: 'Reportes', roles: ['admin'], icon: <ChartIcon /> },
  { to: '/remisiones', label: 'Remisiones', roles: ['admin'], icon: <RemisionIcon /> },
  { to: '/usuarios', label: 'Usuarios', roles: ['admin'], icon: <UsersIcon /> },
]

function ClientsIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}
function ProductsIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  )
}
function InventoryIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
}
function OrdersIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}
function ControlIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
function RemisionIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}
function UsersIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 19h16M6 16l3-5 4 3 5-8"
      />
    </svg>
  )
}
const ChevronLeftIcon = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
)
const MenuIcon = () => (
  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

export function Sidebar() {
  const user = useAuthStore((s) => s.user)
  const clearAuth = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const isFetching = useIsFetching() > 0

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
    } catch {
      // ignore
    }
  }, [collapsed])

  const isAdmin = user?.roles?.includes('admin')
  const isVendedor = user?.roles?.includes('vendedor') && !isAdmin
  const isAlmacen = user?.roles?.includes('almacen') && !isAdmin

  const handleLogout = async () => {
    await authLogout()
    clearAuth()
    navigate('/login', { replace: true })
  }

  // Función para determinar si un usuario tiene acceso a un item
  const canAccessItem = (item: NavItem): boolean => {
    // Si el usuario es admin
    if (isAdmin) {
      return true
    }
    
    // Si el usuario es vendedor
    if (isVendedor) {
      return item.vendedor === true
    }
    
    // Si el usuario es almacen
    if (isAlmacen) {
      return item.roles?.includes('almacen') || false
    }
    
    // Otros roles: solo items sin restricción y que no requieren roles específicos
    return !item.roles && !item.vendedor
  }

  const itemsToShow = navItems
    .filter(item => canAccessItem(item))
    .map(item => ({ ...item, blocked: false }))

  return (
    <aside
      className={`no-print flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
        {collapsed ? (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            title="Expandir menú"
          >
            <MenuIcon />
          </button>
        ) : (
          <>
            <div className="flex flex-1 items-center gap-2 overflow-hidden">
              <img src="/logo-colvalvulas.png" alt="Colvalvulas" className="h-8 w-8 shrink-0 object-contain" />
              <span className="truncate text-sm font-semibold text-slate-900">Colvalvulas</span>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              title="Contraer menú"
            >
              <ChevronLeftIcon />
            </button>
          </>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {itemsToShow.map((item) => {
          const blocked = 'blocked' in item && item.blocked
          const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/')
          const navDisabled = !blocked && isFetching

          if (blocked) {
            return (
              <div
                key={item.to}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-red-600/80"
                title="Sin acceso"
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </div>
            )
          }

          if (navDisabled) {
            return (
              <div
                key={item.to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'cursor-not-allowed opacity-60 text-slate-500'
                }`}
                title={isFetching ? 'Cargando... Espere antes de cambiar de pestaña' : item.label}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </div>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={({ isActive: active }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                  collapsed ? 'justify-center' : ''
                } ${
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>
      <div className={`border-t border-slate-200 p-2 ${collapsed ? 'px-2' : 'p-4'}`}>
        {!collapsed && (
          <div className="mb-2 truncate text-sm text-slate-600">{user?.email}</div>
        )}
        <button
          onClick={handleLogout}
          className={`w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 ${
            collapsed ? 'flex justify-center p-2' : ''
          }`}
          title={collapsed ? 'Cerrar sesión' : undefined}
        >
          {collapsed ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          ) : (
            'Cerrar sesión'
          )}
        </button>
      </div>
    </aside>
  )
}
