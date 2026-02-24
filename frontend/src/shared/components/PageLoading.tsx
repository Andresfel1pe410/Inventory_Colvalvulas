export function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-slate-200 bg-white p-12">
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-slate-300 border-t-primary-600"
        aria-hidden="true"
      />
      <p className="text-sm text-slate-500">Cargando...</p>
    </div>
  )
}
