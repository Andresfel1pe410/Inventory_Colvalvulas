import { Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, RoleGuard } from '@/modules/auth'
import { MainLayout } from '@/app/layout/MainLayout'
import { ClientesListPage, ClienteFormPage, ClienteDetailPage } from '@/modules/clientes'
import { ProductosListPage, ProductoFormPage } from '@/modules/productos'
import { InventarioPage } from '@/modules/inventario'
import { PedidosListPage, PedidoFormPage, PedidoDetailPage, PedidoEditPage } from '@/modules/pedidos'
import { ControlPedidosPage } from '@/modules/control-pedidos'
import { RemisionesListPage } from '@/modules/remisiones'
import { UsuariosListPage } from '@/modules/usuarios'
import { VentasVendedoresPage } from '@/modules/reportes'
import { useAuthStore } from '@/modules/auth'
import { buildSectionPath } from '@/app/routing/sectionPath'

function VentasDefaultRedirect() {
  const isAdmin = useAuthStore((s) => s.user?.roles?.includes('admin'))
  const isAlmacen = useAuthStore((s) => s.user?.roles?.includes('almacen'))
  const ventasPath = (path: string) => buildSectionPath('/ventas', path)

  if (isAlmacen) {
    return <Navigate to={ventasPath('/inventario')} replace />
  }

  return <Navigate to={isAdmin ? ventasPath('/clientes') : ventasPath('/pedidos')} replace />
}

export function VentasRoutes() {
  return (
    <Route
      path="/ventas"
      element={
        <ProtectedRoute>
          <MainLayout basePath="/ventas" section="ventas" />
        </ProtectedRoute>
      }
    >
      <Route index element={<VentasDefaultRedirect />} />
      <Route path="clientes" element={<RoleGuard requireAdmin><ClientesListPage /></RoleGuard>} />
      <Route path="clientes/nuevo" element={<RoleGuard requireAdmin><ClienteFormPage /></RoleGuard>} />
      <Route path="clientes/:id/editar" element={<RoleGuard requireAdmin><ClienteFormPage /></RoleGuard>} />
      <Route path="clientes/:id" element={<RoleGuard requireAdmin><ClienteDetailPage /></RoleGuard>} />
      <Route path="productos" element={<ProductosListPage />} />
      <Route path="productos/nuevo" element={<RoleGuard requireAdmin><ProductoFormPage /></RoleGuard>} />
      <Route path="productos/:id/editar" element={<RoleGuard requireAdmin><ProductoFormPage /></RoleGuard>} />
      <Route path="inventario" element={<RoleGuard allowedRoles={['admin', 'almacen']}><InventarioPage /></RoleGuard>} />
      <Route path="pedidos" element={<PedidosListPage />} />
      <Route path="pedidos/nuevo" element={<PedidoFormPage />} />
      <Route path="pedidos/:id" element={<PedidoDetailPage />} />
      <Route path="pedidos/:id/editar" element={<PedidoEditPage />} />
      <Route path="control-pedidos" element={<ControlPedidosPage />} />
      <Route path="remisiones" element={<RoleGuard requireAdmin><RemisionesListPage /></RoleGuard>} />
      <Route path="usuarios" element={<RoleGuard requireAdmin><UsuariosListPage /></RoleGuard>} />
      <Route path="graficas" element={<RoleGuard requireAdmin><VentasVendedoresPage /></RoleGuard>} />
    </Route>
  )
}