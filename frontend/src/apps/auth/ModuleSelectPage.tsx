import { useNavigate } from 'react-router-dom'

export function ModuleSelectPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.92),_rgba(15,23,42,1))] px-4 py-10 text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-[-4rem] top-24 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/3 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-4xl rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur-xl md:p-12">
        <div className="mb-8 flex items-center gap-4">
          <img src="/logo-colvalvulas.png" alt="Colvalvulas" className="h-14 w-14 rounded-2xl bg-white/5 p-2 object-contain" />
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">ERP Colvalvulas</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Selecciona el módulo de trabajo
            </h1>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/ventas')}
            className="group rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-6 text-left transition hover:-translate-y-1 hover:border-emerald-300/40 hover:bg-emerald-400/15"
          >
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-200/80">API Ventas</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Ventas</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Clientes, productos, pedidos, remisiones, inventario y reportes en una interfaz unificada.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-emerald-200">
              Entrar a Ventas
              <span className="ml-2 transition group-hover:translate-x-1">→</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/proceso')}
            className="group rounded-2xl border border-sky-400/20 bg-sky-400/10 p-6 text-left transition hover:-translate-y-1 hover:border-sky-300/40 hover:bg-sky-400/15"
          >
            <p className="text-sm uppercase tracking-[0.25em] text-sky-200/80">API Proceso</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Proceso</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Acceso exclusivo a la lógica de inventario de proceso y sus movimientos.
            </p>
            <span className="mt-6 inline-flex items-center text-sm font-medium text-sky-200">
              Entrar a Proceso
              <span className="ml-2 transition group-hover:translate-x-1">→</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}