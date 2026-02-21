import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '@/modules/auth'
import { MainLayout } from '../layout/MainLayout'
import { LoginPage } from '@/modules/auth'
import { ClientesListPage, ClienteFormPage } from '@/modules/clientes'
import { ProductosListPage, ProductoFormPage } from '@/modules/productos'
import { InventarioPage } from '@/modules/inventario'
import { PedidosListPage, PedidoFormPage, PedidoDetailPage, PedidoEditPage } from '@/modules/pedidos'
import { ControlPedidosPage } from '@/modules/control-pedidos'
import { RemisionesListPage } from '@/modules/remisiones'
import { UsuariosListPage } from '@/modules/usuarios'

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
        <Route index element={<Navigate to="/clientes" replace />} />
        <Route path="clientes" element={<ClientesListPage />} />
        <Route path="clientes/nuevo" element={<ClienteFormPage />} />
        <Route path="clientes/:id/editar" element={<ClienteFormPage />} />
        <Route path="productos" element={<ProductosListPage />} />
        <Route path="productos/nuevo" element={<ProductoFormPage />} />
        <Route path="productos/:id/editar" element={<ProductoFormPage />} />
        <Route path="inventario" element={<InventarioPage />} />
        <Route path="pedidos" element={<PedidosListPage />} />
        <Route path="pedidos/nuevo" element={<PedidoFormPage />} />
        <Route path="pedidos/:id" element={<PedidoDetailPage />} />
        <Route path="pedidos/:id/editar" element={<PedidoEditPage />} />
        <Route path="control-pedidos" element={<ControlPedidosPage />} />
        <Route path="remisiones" element={<RemisionesListPage />} />
        <Route path="usuarios" element={<UsuariosListPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
