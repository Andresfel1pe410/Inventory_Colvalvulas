import { Route } from 'react-router-dom'
import { ProtectedRoute } from '@/modules/auth'
import { LoginPage } from '@/modules/auth'
import { ModuleSelectPage } from './ModuleSelectPage'

export function AuthRoutes() {
  return (
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ModuleSelectPage />
          </ProtectedRoute>
        }
      />
    </>
  )
}