import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, RoleGuard, useAuthStore } from '@/modules/auth'
import { LoginPage } from '@/modules/auth'
import { MainLayout } from '@/app/layout/MainLayout'
import { ModuleSelectPage } from '../auth/ModuleSelectPage'
import { ClientesListPage, ClienteFormPage, ClienteDetailPage } from '@/modules/clientes'
import { ProductosListPage, ProductoFormPage } from '@/modules/productos'
import { InventarioPage } from '@/modules/inventario'
import { InventarioProcesoPage } from '@/modules/inventario-proceso'
import { PlaneacionListPage, DependenciaDetailPage } from '@/modules/planeacion'
import { PedidosListPage, PedidoFormPage, PedidoDetailPage, PedidoEditPage } from '@/modules/pedidos'
import { ControlPedidosPage } from '@/modules/control-pedidos'
import { RemisionesListPage } from '@/modules/remisiones'
import { UsuariosListPage } from '@/modules/usuarios'
import { VentasVendedoresPage } from '@/modules/reportes'
import { EmpleadosListPage, EmpleadoFormPage } from '@/modules/empleados'
import { ReporteAsistenciaPage } from '@/modules/asistencia'
import { buildSectionPath } from '@/app/routing/sectionPath'

export function RootApp() {
  const isAdmin = useAuthStore((s) => s.user?.roles?.includes('admin'))
  const isAlmacen = useAuthStore((s) => s.user?.roles?.includes('almacen'))
  const isAuditorContable = useAuthStore((s) => s.user?.roles?.includes('auditor_contable'))
  const ventasPath = (path: string) => buildSectionPath('/ventas', path)

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ModuleSelectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ventas"
        element={
          <ProtectedRoute>
            <MainLayout basePath="/ventas" section="ventas" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to={isAlmacen ? ventasPath('/inventario') : (isAdmin || isAuditorContable) ? ventasPath('/clientes') : ventasPath('/pedidos')} replace />} />
        <Route path="clientes" element={<RoleGuard allowedRoles={['admin', 'auditor_contable']}><ClientesListPage /></RoleGuard>} />
        <Route path="clientes/nuevo" element={<RoleGuard requireAdmin><ClienteFormPage /></RoleGuard>} />
        <Route path="clientes/:id/editar" element={<RoleGuard allowedRoles={['admin', 'auditor_contable']}><ClienteFormPage /></RoleGuard>} />
        <Route path="clientes/:id" element={<RoleGuard allowedRoles={['admin', 'auditor_contable']}><ClienteDetailPage /></RoleGuard>} />
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
      <Route
        path="/proceso"
        element={
          <ProtectedRoute>
            <MainLayout basePath="/proceso" section="proceso" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="inventario-proceso" replace />} />
        <Route path="inventario-proceso" element={<RoleGuard allowedRoles={['admin', 'almacen']}><InventarioProcesoPage /></RoleGuard>} />
        <Route path="planeacion" element={<RoleGuard requireAdmin><PlaneacionListPage /></RoleGuard>} />
        <Route path="planeacion/:id" element={<RoleGuard requireAdmin><DependenciaDetailPage /></RoleGuard>} />
      </Route>
      <Route
        path="/rrhh"
        element={
          <ProtectedRoute>
            <MainLayout basePath="/rrhh" section="rrhh" />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="empleados" replace />} />
        <Route path="empleados" element={<RoleGuard requireAdmin><EmpleadosListPage /></RoleGuard>} />
        <Route path="empleados/nuevo" element={<RoleGuard requireAdmin><EmpleadoFormPage /></RoleGuard>} />
        <Route path="empleados/:id/editar" element={<RoleGuard requireAdmin><EmpleadoFormPage /></RoleGuard>} />
        <Route path="reporte" element={<RoleGuard requireAdmin><ReporteAsistenciaPage /></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}