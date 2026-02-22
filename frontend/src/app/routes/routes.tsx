import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, RoleGuard } from '@/modules/auth'
import { MainLayout } from '../layout/MainLayout'
import { LoginPage } from '@/modules/auth'
import { ClientesListPage, ClienteFormPage, ClienteDetailPage } from '@/modules/clientes'
import { ProductosListPage, ProductoFormPage } from '@/modules/productos'
import { InventarioPage } from '@/modules/inventario'
import { PedidosListPage, PedidoFormPage, PedidoDetailPage, PedidoEditPage } from '@/modules/pedidos'
import { ControlPedidosPage } from '@/modules/control-pedidos'
import { RemisionesListPage } from '@/modules/remisiones'
import { UsuariosListPage } from '@/modules/usuarios'
import { useAuthStore } from '@/modules/auth'

function DefaultRedirect() {
  const isAdmin = useAuthStore((s) => s.user?.roles?.includes('admin'))
  return <Navigate to={isAdmin ? '/clientes' : '/pedidos'} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultRedirect />} />
        <Route path="clientes" element={<RoleGuard requireAdmin><ClientesListPage /></RoleGuard>} />
        <Route path="clientes/nuevo" element={<RoleGuard requireAdmin><ClienteFormPage /></RoleGuard>} />
        <Route path="clientes/:id/editar" element={<RoleGuard requireAdmin><ClienteFormPage /></RoleGuard>} />
        <Route path="clientes/:id" element={<RoleGuard requireAdmin><ClienteDetailPage /></RoleGuard>} />
        <Route path="productos" element={<ProductosListPage />} />
        <Route path="productos/nuevo" element={<RoleGuard requireAdmin><ProductoFormPage /></RoleGuard>} />
        <Route path="productos/:id/editar" element={<RoleGuard requireAdmin><ProductoFormPage /></RoleGuard>} />
        <Route path="inventario" element={<RoleGuard requireAdmin><InventarioPage /></RoleGuard>} />
        <Route path="pedidos" element={<PedidosListPage />} />
        <Route path="pedidos/nuevo" element={<PedidoFormPage />} />
        <Route path="pedidos/:id" element={<PedidoDetailPage />} />
        <Route path="pedidos/:id/editar" element={<PedidoEditPage />} />
        <Route path="control-pedidos" element={<ControlPedidosPage />} />
        <Route path="remisiones" element={<RoleGuard requireAdmin><RemisionesListPage /></RoleGuard>} />
        <Route path="usuarios" element={<RoleGuard requireAdmin><UsuariosListPage /></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
