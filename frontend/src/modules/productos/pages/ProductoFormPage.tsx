import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { productoService } from '../services/producto.service'
import { LISTAS_PRECIOS, LISTA_LABELS } from '../types/producto.types'
import type { ProductoCreate } from '../types/producto.types'

export function ProductoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ProductoCreate>({
    codigo: '',
    referencia: '',
    material: '',
    precio: 0,
    lista: 'lista_1',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isEdit && id) {
      productoService
        .get(Number(id))
        .then((p) =>
          setForm({
            codigo: p.codigo,
            referencia: p.referencia,
            material: p.material,
            precio: p.precio ?? 0,
            lista: p.lista || 'lista_1',
          })
        )
        .catch(() => setError('Producto no encontrado'))
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data: ProductoCreate = {
        ...form,
        precio: typeof form.precio === 'number' ? form.precio : parseFloat(String(form.precio)) || 0,
      }
      if (isEdit && id) {
        await productoService.update(Number(id), data)
      } else {
        await productoService.create(data)
      }
      navigate('/productos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        {isEdit ? 'Editar producto' : 'Nuevo producto'}
      </h1>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Código *</label>
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Precio *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.precio}
              onChange={(e) => {
                const v = e.target.value
                setForm((f) => ({
                  ...f,
                  precio: v === '' ? 0 : parseFloat(v) || 0,
                }))
              }}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Lista *</label>
            <select
              value={form.lista}
              onChange={(e) => setForm((f) => ({ ...f, lista: e.target.value }))}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {LISTAS_PRECIOS.map((l) => (
                <option key={l} value={l}>
                  {LISTA_LABELS[l]}
                </option>
              ))}
            </select>
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
