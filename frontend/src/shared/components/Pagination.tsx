interface PaginationProps {
  page: number
  total: number
  limit: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / limit) || 1
  const canPrev = page > 1
  const canNext = page < totalPages

  return (
    <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3">
      <div className="text-sm text-slate-600">
        Mostrando {(page - 1) * limit + 1} a{' '}
        {Math.min(page * limit, total)} de {total}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          Anterior
        </button>
        <span className="flex items-center px-3 text-sm text-slate-600">
          Página {page} de {totalPages}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  )
}
