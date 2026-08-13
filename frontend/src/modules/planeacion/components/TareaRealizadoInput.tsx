import { useEffect, useState } from 'react'

interface TareaRealizadoInputProps {
  cantidad: number
  realizado: number
  onCommit: (realizado: number) => void
  disabled?: boolean
}

/** Input "tonto" para el avance (realizado) de una tarea, junto a la
 * cantidad pedida. Solo dispara onCommit al perder foco o con Enter, para
 * no mandar una petición por cada tecla -- mismo patrón reusable de
 * TareaEstadoSelect. */
export function TareaRealizadoInput({ cantidad, realizado, onCommit, disabled }: TareaRealizadoInputProps) {
  const [valor, setValor] = useState(String(realizado))

  useEffect(() => {
    setValor(String(realizado))
  }, [realizado])

  const commit = () => {
    const numero = parseInt(valor, 10)
    const limpio = Number.isNaN(numero) || numero < 0 ? 0 : numero
    setValor(String(limpio))
    if (limpio !== realizado) {
      onCommit(limpio)
    }
  }

  return (
    <div className="flex items-center gap-1 text-xs text-slate-600">
      <span className="text-slate-400">Realizado</span>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={valor}
        onChange={(e) => setValor(e.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            ;(e.currentTarget as HTMLInputElement).blur()
          }
        }}
        disabled={disabled}
        className="w-14 rounded-md border border-slate-300 px-2 py-1 text-right"
      />
      <span>/ {cantidad}</span>
    </div>
  )
}
