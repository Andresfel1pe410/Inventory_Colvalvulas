import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clienteService } from '../services/cliente.service'
import { usuarioService } from '@/modules/usuarios/services/usuario.service'
import type { ClienteCreate } from '../types/cliente.types'
import type { UsuarioSistema } from '@/modules/usuarios/types/usuario.types'

export function ClienteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ClienteCreate>({
    codigo: '',
    nombre: '',
    nit: '',
    razon_social: '',
    nombre_gerente: '',
    direccion: '',
    telefono: '',
    ciudad: '',
    departamento: '',
    email: '',
    vendedor_id: undefined,
    activo: true,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([])

  useEffect(() => {
    usuarioService.list({ limit: 200 }).then(setUsuarios)
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      clienteService
        .get(Number(id))
        .then((c) =>
          setForm({
            codigo: c.codigo,
            nombre: c.nombre,
            nit: c.nit || '',
            razon_social: c.razon_social || c.nombre || '',
            nombre_gerente: c.nombre_gerente || '',
            direccion: c.direccion || '',
            telefono: c.telefono || '',
            ciudad: c.ciudad || '',
            departamento: c.departamento || '',
            vendedor_id: c.vendedor_id,
            email: c.email || '',
            activo: c.activo,
          })
        )
        .catch(() => setError('Cliente no encontrado'))
    }
  }, [id, isEdit])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = {
        ...form,
        nombre: form.razon_social || form.nombre,
        nit: form.nit || undefined,
        razon_social: form.razon_social || form.nombre || undefined,
        nombre_gerente: form.nombre_gerente || undefined,
        direccion: form.direccion || undefined,
        telefono: form.telefono || undefined,
        ciudad: form.ciudad || undefined,
        departamento: form.departamento || undefined,
        vendedor_id: form.vendedor_id || undefined,
        email: form.email || undefined,
      }
      if (isEdit && id) {
        await clienteService.update(Number(id), data)
      } else {
        await clienteService.create(data)
      }
      navigate('/clientes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
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
            <label className="block text-sm font-medium text-slate-700">NIT</label>
            <input
              type="text"
              value={form.nit}
              onChange={(e) => setForm((f) => ({ ...f, nit: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Razón Social</label>
          <input
            type="text"
            value={form.razon_social}
            onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Nombre Gerente</label>
          <input
            type="text"
            value={form.nombre_gerente}
            onChange={(e) => setForm((f) => ({ ...f, nombre_gerente: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Teléfono</label>
          <input
            type="text"
            value={form.telefono}
            onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Dirección</label>
          <input
            type="text"
            value={form.direccion}
            onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Ciudad</label>
            <input
              type="text"
              value={form.ciudad}
              onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Departamento</label>
            <input
              type="text"
              value={form.departamento}
              onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Vendedor (opcional)</label>
          <select
            value={form.vendedor_id ?? ''}
            onChange={(e) =>
              setForm((f) => ({ ...f, vendedor_id: e.target.value ? Number(e.target.value) : undefined }))
            }
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Ninguno</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {[u.nombre, u.apellido].filter(Boolean).join(' ') || u.email}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
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
            onClick={() => navigate('/clientes')}
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
