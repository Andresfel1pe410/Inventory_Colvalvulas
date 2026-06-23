import { Link, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { PrefetchOnAuth } from './PrefetchOnAuth'
import { SectionPathProvider, type AppSection } from '../routing/sectionPath'

interface MainLayoutProps {
  basePath?: string
  section?: AppSection
}

export function MainLayout({ basePath = '', section = 'legacy' }: MainLayoutProps) {
  const switchTarget = section === 'ventas' ? '/proceso' : '/ventas'
  const switchLabel = section === 'ventas' ? 'Ir a Proceso' : 'Ir a Ventas'

  return (
    <SectionPathProvider basePath={basePath}>
      <div className="flex h-screen">
        <PrefetchOnAuth />
        <Sidebar section={section} />
        <main className="flex-1 overflow-auto bg-slate-50">
          <div className="border-b border-slate-200 bg-white px-6 py-4">
            <div className="flex flex-wrap items-center gap-3">
              {section !== 'legacy' && (
                <Link
                  to="/"
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Volver al selector
                </Link>
              )}
              {section !== 'legacy' && (
                <Link
                  to={switchTarget}
                  className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  {switchLabel}
                </Link>
              )}
            </div>
          </div>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SectionPathProvider>
  )
}
