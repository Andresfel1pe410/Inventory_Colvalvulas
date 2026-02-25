import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { PrefetchOnAuth } from './PrefetchOnAuth'

export function MainLayout() {
  return (
    <div className="flex h-screen">
      <PrefetchOnAuth />
      <Sidebar />
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
