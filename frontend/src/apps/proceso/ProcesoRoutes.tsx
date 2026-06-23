import { Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, RoleGuard } from '@/modules/auth'
import { MainLayout } from '@/app/layout/MainLayout'
import { InventarioProcesoPage } from '@/modules/inventario-proceso'

export function ProcesoRoutes() {
  return (
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
    </Route>
  )
}