import { useState, useEffect, useRef, useMemo } from 'react'
import type { Producto } from '@/modules/productos/types/producto.types'

interface ProductoSearchSelectProps {
  value: number | ''
  onChange: (productoId: number | '') => void
  products: Producto[]
  formatLabel: (p: Producto) => string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ProductoSearchSelect({
  value,
  onChange,
  products,
  formatLabel,
  placeholder = 'Buscar producto...',
  disabled = false,
  className = '',
}: ProductoSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedProduct = products.find((p) => p.id === value)

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) =>
      (a.referencia || '').localeCompare(b.referencia || '', 'es')
    )
  }, [products])

  const filteredProducts = useMemo(() => {
    return sortedProducts.filter((p) => {
      const term = query.trim().toLowerCase()
      if (!term) return true
      const ref = (p.referencia || '').toLowerCase()
      const mat = (p.material || '').toLowerCase()
      const codigos = (p.listas_precio || [])
        .map((lp) => (lp.codigo || '').toLowerCase())
        .join(' ')
      return ref.includes(term) || mat.includes(term) || codigos.includes(term)
    })
  }, [sortedProducts, query])

  useEffect(() => {
    setHighlightIndex(0)
  }, [filteredProducts])

  useEffect(() => {
    if (!open) {
      if (value && selectedProduct) {
        setQuery(formatLabel(selectedProduct))
      } else if (!value) {
        setQuery('')
      }
    }
  }, [value, selectedProduct, open, formatLabel])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (p: Producto) => {
    onChange(p.id)
    setQuery(formatLabel(p))
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

  const handleClick = () => {
    if (!open) {
      setOpen(true)
      setQuery('')
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
      setHighlightIndex((i) => (i < filteredProducts.length - 1 ? i + 1 : 0))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : filteredProducts.length - 1))
      return
    }
    if (e.key === 'Enter' && filteredProducts[highlightIndex]) {
      e.preventDefault()
      handleSelect(filteredProducts[highlightIndex])
    }
  }

  const displayValue = open ? query : (selectedProduct ? formatLabel(selectedProduct) : query)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={() => {
          setOpen(true)
          setQuery('')
        }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      {open && (
        <ul
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filteredProducts.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              {query.trim() ? 'Sin coincidencias' : 'No hay productos'}
            </li>
          ) : (
            filteredProducts.map((p, idx) => (
              <li
                key={p.id}
                role="option"
                aria-selected={p.id === value}
                className={`cursor-pointer px-3 py-2 text-sm ${
                  idx === highlightIndex ? 'bg-primary-50 text-primary-900' : 'text-slate-700 hover:bg-slate-50'
                } ${p.id === value ? 'font-medium' : ''}`}
                onClick={() => handleSelect(p)}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                {formatLabel(p)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
