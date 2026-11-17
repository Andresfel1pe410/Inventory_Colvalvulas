import { useState, useEffect } from 'react'

interface ModalMontoParcialProps {
  isOpen: boolean
  clienteNombre?: string
  valorInicial?: number | null
  onClose: () => void
  onConfirm: (monto: number) => void
}

export function ModalMontoParcial({
  isOpen,
  clienteNombre,
  valorInicial,
  onClose,
  onConfirm,
}: ModalMontoParcialProps) {
  const [monto, setMonto] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      setMonto(valorInicial != null && valorInicial > 0 ? String(valorInicial) : '')
      setError('')
    }
  }, [isOpen, valorInicial])

  if (!isOpen) return null

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(monto)
    if (isNaN(num) || num <= 0) {
      setError('Por favor ingresa un monto válido mayor a 0.')
      return
    }
    onConfirm(num)
  }

  const montoNumero = parseFloat(monto)
  const formateado = !isNaN(montoNumero) && montoNumero > 0
    ? new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }).format(montoNumero)
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl transition-all">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Monto Máximo de Envío Parcial
            </h3>
            {clienteNombre && (
              <p className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
                {clienteNombre}
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleGuardar} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Valor máximo del parcial ($ COP) <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Indica la cantidad máxima de dinero que puede costar el pedido despachado para este cliente.
            </p>
            <div className="relative mt-1 rounded-md shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-slate-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                min="1"
                step="any"
                autoFocus
                placeholder="0"
                value={monto}
                onChange={(e) => {
                  setMonto(e.target.value)
                  if (error) setError('')
                }}
                className="block w-full rounded-md border border-slate-300 pl-8 pr-12 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
              />
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-xs text-slate-400">COP</span>
              </div>
            </div>
            {formateado && (
              <p className="mt-1.5 text-xs font-semibold text-amber-700">
                Límite: {formateado}
              </p>
            )}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              Guardar y Asignar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
