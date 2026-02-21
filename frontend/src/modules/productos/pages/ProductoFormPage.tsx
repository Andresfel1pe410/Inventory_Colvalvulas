import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { productoService } from '../services/producto.service'
import type { ProductoCreate } from '../types/producto.types'

export function ProductoFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ProductoCreate>({
    codigo: '',
    nombre: '',
    descripcion: '',
    unidad_medida: 'UND',
    precio_lista_1: undefined,
    precio_lista_2: undefined,
    precio_lista_3: undefined,
    precio_lista_plus: undefined,
    activo: true,
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
            nombre: p.nombre,
            descripcion: p.descripcion || '',
            unidad_medida: p.unidad_medida,
            precio_lista_1: p.precio_lista_1 ?? undefined,
            precio_lista_2: p.precio_lista_2 ?? undefined,
            precio_lista_3: p.precio_lista_3 ?? undefined,
            precio_lista_plus: p.precio_lista_plus ?? undefined,
            activo: p.activo,
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
        descripcion: form.descripcion || undefined,
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
            <label className="block text-sm font-medium text-slate-700">Código</label>
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Material</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            rows={2}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Unidad</label>
          <select
            value={form.unidad_medida}
            onChange={(e) => setForm((f) => ({ ...f, unidad_medida: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="UND">UND</option>
            <option value="KG">KG</option>
            <option value="L">L</option>
            <option value="M">M</option>
          </select>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-3 font-medium text-slate-900">Listas de precios</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-600">Lista 1</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder=""
                value={form.precio_lista_1 === undefined || form.precio_lista_1 === null ? '' : form.precio_lista_1}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    precio_lista_1: v === '' ? undefined : (parseFloat(v) || 0),
                  }))
                }}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Lista 2</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder=""
                value={form.precio_lista_2 === undefined || form.precio_lista_2 === null ? '' : form.precio_lista_2}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    precio_lista_2: v === '' ? undefined : (parseFloat(v) || 0),
                  }))
                }}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Lista 3</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder=""
                value={form.precio_lista_3 === undefined || form.precio_lista_3 === null ? '' : form.precio_lista_3}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    precio_lista_3: v === '' ? undefined : (parseFloat(v) || 0),
                  }))
                }}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600">Lista Plus</label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder=""
                value={form.precio_lista_plus === undefined || form.precio_lista_plus === null ? '' : form.precio_lista_plus}
                onChange={(e) => {
                  const v = e.target.value
                  setForm((f) => ({
                    ...f,
                    precio_lista_plus: v === '' ? undefined : (parseFloat(v) || 0),
                  }))
                }}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="activo"
            checked={form.activo}
            onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
            className="rounded border-slate-300"
          />
          <label htmlFor="activo" className="text-sm text-slate-700">
            Activo
          </label>
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
