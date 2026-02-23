import { useState, useEffect, useRef } from 'react'
import { useClientesList, useCliente } from '@/modules/clientes/hooks/useClientes'
import type { Cliente } from '@/modules/clientes/types/cliente.types'

function formatClienteLabel(c: Cliente): string {
  const doc = `${c.tipo_documento} ${c.numero_identificacion}${c.dv ? `-${c.dv}` : ''}`
  return `${c.razon_social} (${doc})`
}

interface ClienteSearchSelectProps {
  value: number | ''
  onChange: (clienteId: number | '') => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function ClienteSearchSelect({
  value,
  onChange,
  placeholder = 'Buscar por nombre o NIT...',
  disabled = false,
  required = false,
  className = '',
}: ClienteSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [queryDebounced, setQueryDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setQueryDebounced(query.trim()), 250)
    return () => clearTimeout(t)
  }, [query])

  const { data: clientes = [], isLoading } = useClientesList({
    search: queryDebounced || undefined,
    limit: 50,
  })
  // Solo mostrar resultados cuando hay búsqueda (evitar lista enorme al abrir)
  const clientesToShow = queryDebounced ? clientes : []
  const { data: selectedCliente } = useCliente(
    value !== '' && typeof value === 'number' ? value : null
  )

  useEffect(() => {
    if (value && selectedCliente) {
      setQuery(formatClienteLabel(selectedCliente))
    } else if (!value && !open) {
      setQuery('')
    }
  }, [value, selectedCliente, open])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (c: Cliente) => {
    onChange(c.id)
    setQuery(formatClienteLabel(c))
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    setOpen(true)
    if (!v.trim()) {
      onChange('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key !== 'Escape') {
      setOpen(true)
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i < clientesToShow.length - 1 ? i + 1 : 0))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : clientesToShow.length - 1))
      return
    }
    if (e.key === 'Enter' && clientesToShow[highlightIndex]) {
      e.preventDefault()
      handleSelect(clientesToShow[highlightIndex])
    }
  }

  const displayValue = open ? query : (selectedCliente ? formatClienteLabel(selectedCliente) : query)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        required={required && !value}
        autoComplete="off"
        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
      />
      {open && (
        <ul
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {isLoading ? (
            <li className="px-3 py-2 text-sm text-slate-500">Buscando...</li>
          ) : clientesToShow.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              {queryDebounced ? 'Sin coincidencias' : 'Escriba para buscar por nombre o NIT'}
            </li>
          ) : (
            clientesToShow.map((c, idx) => (
              <li
                key={c.id}
                role="option"
                aria-selected={c.id === value}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  idx === highlightIndex ? 'bg-primary-50 text-primary-900' : 'text-slate-700 hover:bg-slate-50'
                } ${c.id === value ? 'font-medium' : ''}`}
                onClick={() => handleSelect(c)}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                {formatClienteLabel(c)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
