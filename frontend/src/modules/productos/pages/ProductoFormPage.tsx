import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProducto, useProductoCreate, useProductoUpdate } from '../hooks/useProductos'
import { LISTAS_PRECIOS, LISTA_LABELS } from '../types/producto.types'
import type { ProductoCreate, ProductoListaPrecioInput } from '../types/producto.types'

const emptyListasPrecio = (): ProductoListaPrecioInput[] =>
  LISTAS_PRECIOS.map((lista) => ({ lista, codigo: '', precio: 0 }))

export function ProductoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<{
    referencia: string
    material: string
    listas_precio: ProductoListaPrecioInput[]
  }>({
    referencia: '',
    material: '',
    listas_precio: emptyListasPrecio(),
  })
  const [error, setError] = useState('')

  const { data: producto, isLoading: loadingProducto } = useProducto(
    isEdit && id ? Number(id) : null
  )
  const createMutation = useProductoCreate()
  const updateMutation = useProductoUpdate()

  useEffect(() => {
    if (producto) {
      const listas = LISTAS_PRECIOS.map((lista) => {
        const lp = producto.listas_precio?.find((l) => l.lista === lista)
        return {
          lista,
          codigo: lp?.codigo ?? '',
          precio: lp?.precio ?? 0,
        }
      })
      setForm({
        referencia: producto.referencia,
        material: producto.material,
        listas_precio: listas,
      })
    }
  }, [producto])

  const updateLista = (idx: number, field: 'codigo' | 'precio', value: string | number) => {
    setForm((f) => {
      const copy = [...f.listas_precio]
      copy[idx] = { ...copy[idx], [field]: value }
      return { ...f, listas_precio: copy }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const listas_precio = form.listas_precio
      .filter((lp) => lp.codigo.trim() !== '')
      .map((lp) => ({
        lista: lp.lista,
        codigo: lp.codigo.trim(),
        precio: typeof lp.precio === 'number' ? lp.precio : parseFloat(String(lp.precio)) || 0,
      }))
    if (listas_precio.length === 0) {
      setError('Debe ingresar al menos un código y precio en alguna lista')
      return
    }
    const data: ProductoCreate = {
      referencia: form.referencia,
      material: form.material,
      listas_precio,
    }
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id: Number(id), data })
      } else {
        await createMutation.mutateAsync(data)
      }
      navigate('/productos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    }
  }

  const loading = createMutation.isPending || updateMutation.isPending

  if (isEdit && loadingProducto) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
        Cargando...
      </div>
    )
  }

  if (isEdit && id && !loadingProducto && !producto) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
        Producto no encontrado
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('/productos')}
            className="text-primary-600 hover:underline"
          >
            Volver a productos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        {isEdit ? 'Editar producto' : 'Nuevo producto'}
      </h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Referencia *</label>
            <input
              type="text"
              value={form.referencia}
              onChange={(e) => setForm((f) => ({ ...f, referencia: e.target.value }))}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Material *</label>
            <input
              type="text"
              value={form.material}
              onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-medium text-slate-700">Listas de precios</h3>
          <p className="mb-4 text-xs text-slate-500">
            Ingrese código y precio para cada lista. Al menos una lista debe tener datos.
          </p>
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            {LISTAS_PRECIOS.map((lista, idx) => (
              <div
                key={lista}
                className="grid grid-cols-[1fr_120px_100px] items-end gap-3 sm:grid-cols-[1fr_140px_120px]"
              >
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    {LISTA_LABELS[lista]}
                  </label>
                  <input
                    type="text"
                    placeholder="Código"
                    value={form.listas_precio[idx]?.codigo ?? ''}
                    onChange={(e) => updateLista(idx, 'codigo', e.target.value)}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">Precio</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={form.listas_precio[idx]?.precio ?? 0}
                    onChange={(e) => {
                      const v = e.target.value
                      updateLista(idx, 'precio', v === '' ? 0 : parseFloat(v) || 0)
                    }}
                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/productos')}
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
