import { useState, useEffect } from 'react'
import type { InventarioProceso } from '../types/inventario-proceso.types'
import { useInventarioProcesoRegistrarMovimiento } from '../hooks/useInventarioProceso'

interface EntradaSalidaProcesoModalProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  tipo: 'entrada' | 'salida'
  items: InventarioProceso[]
  item: InventarioProceso | null
}

const USUARIOS_HARDCODEADOS = [
  'Alex',
  'Daniel',
  'Misael',
  'Jose',
  'Neifer',
  'Mauricio',
  'Andres Nieto'
]

export function EntradaSalidaProcesoModal({
  open,
  onClose,
  onCreated,
  tipo,
  items,
  item,
}: EntradaSalidaProcesoModalProps) {
  const [referencia, setReferencia] = useState('')
  const [material, setMaterial] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [usuario, setUsuario] = useState('')
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false)

  const registrarMutation = useInventarioProcesoRegistrarMovimiento()

  const isNew = item === null
  const sugerencias = items.filter((registro) => {
    const texto = `${registro.referencia} ${registro.material}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase())
  })

  useEffect(() => {
    if (open) {
      setReferencia(item?.referencia || '')
      setMaterial(item?.material || '')
      setCantidad('')
      setUsuario('')
      setError('')
      setBusqueda(item?.referencia || '')
      setMostrarSugerencias(false)
    }
  }, [open, item])

  useEffect(() => {
    if (!busqueda.trim()) {
      setReferencia('')
      setMaterial('')
      return
    }

    const seleccionado = items.find((registro) => registro.referencia === busqueda.trim())
    if (seleccionado) {
      setReferencia(seleccionado.referencia)
      setMaterial(seleccionado.material)
    }
  }, [busqueda, items])

  const seleccionarSugerencia = (registro: InventarioProceso) => {
    setBusqueda(registro.referencia)
    setReferencia(registro.referencia)
    setMaterial(registro.material)
    setMostrarSugerencias(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!referencia.trim() || !material.trim()) {
      setError('La referencia y el material son obligatorios')
      return
    }
    if (!cantidad || Number(cantidad) <= 0) {
      setError('La cantidad debe ser mayor a cero')
      return
    }
    if (!usuario.trim()) {
      setError('Debe seleccionar quién realiza la operación')
      return
    }

    try {
      await registrarMutation.mutateAsync({
        referencia,
        material,
        tipo,
        cantidad: Number(cantidad),
        usuario_realizo: usuario,
      })
      onCreated()
    } catch (err) {
      setError((err as any)?.message || 'Error al registrar movimiento')
    }
  }

  if (!open) return null

  const title = isNew ? 'Nueva Entrada de Proceso' : tipo === 'entrada' ? 'Entrada de Inventario' : 'Salida de Inventario'
  const buttonText = registrarMutation.isPending ? 'Registrando...' : tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Salida'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Referencia *</label>
            <div className="relative">
              <input
                type="search"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setReferencia(e.target.value)
                  setMaterial('')
                  setMostrarSugerencias(true)
                }}
                onFocus={() => setMostrarSugerencias(true)}
                placeholder="Buscar referencia o material"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-600 focus:outline-none"
                disabled={registrarMutation.isPending}
                autoComplete="off"
              />

              {mostrarSugerencias && sugerencias.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {sugerencias.map((registro) => (
                    <button
                      key={registro.id}
                      type="button"
                      onClick={() => seleccionarSugerencia(registro)}
                      className="flex w-full flex-col gap-0.5 border-b border-slate-100 px-3 py-2 text-left hover:bg-slate-50 last:border-b-0"
                    >
                      <span className="text-sm font-medium text-slate-900">{registro.referencia}</span>
                      <span className="text-xs text-slate-500">{registro.material}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Material *</label>
            <input
              type="text"
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              placeholder="Ej: Acero Inox"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-600 focus:outline-none"
              disabled={registrarMutation.isPending}
            />
          </div>

          {!isNew && (
            <p className="text-sm text-slate-600">
              <strong>Cantidad actual:</strong> {item.cantidad}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">Cantidad *</label>
            <input
              type="number"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              placeholder="Ej: 10"
              min="1"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-primary-600 focus:outline-none"
              disabled={registrarMutation.isPending}
            />
            {tipo === 'salida' && item && item.cantidad >= 0 && (
              <p className="mt-1 text-xs text-amber-600">⚠ Disponible para salida: {item.cantidad}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Realizado por *</label>
            <select
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-primary-600 focus:outline-none"
              disabled={registrarMutation.isPending}
            >
              <option value="">Selecciona una persona</option>
              {USUARIOS_HARDCODEADOS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={registrarMutation.isPending}
              className="flex-1 rounded-md bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-70"
            >
              {buttonText}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={registrarMutation.isPending}
              className="flex-1 rounded-md border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-70"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}