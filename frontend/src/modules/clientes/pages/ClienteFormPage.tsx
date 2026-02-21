import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { clienteService } from '../services/cliente.service'
import {
  DEPARTAMENTOS_COLOMBIA,
  MUNICIPIOS_POR_DEPARTAMENTO,
} from '@/shared/constants/colombia'
import { VENDEDORES } from '@/shared/constants/vendedores'
import { TIPOS_DOCUMENTO } from '../types/cliente.types'
import type { ClienteCreate } from '../types/cliente.types'

export function ClienteFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [form, setForm] = useState<ClienteCreate>({
    razon_social: '',
    tipo_documento: 'NIT',
    numero_identificacion: '',
    dv: '',
    regimen: '',
    pais: 'Colombia',
    ciudad: '',
    direccion: '',
    telefono: '',
    departamento: '',
    codigo_postal: '',
    email: '',
    responsabilidad_fiscal: '',
    detalles_tributarios: '',
    vendedor: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const municipiosDisponibles = form.departamento
    ? MUNICIPIOS_POR_DEPARTAMENTO[form.departamento] ?? []
    : []

  useEffect(() => {
    if (isEdit && id) {
      clienteService
        .get(Number(id))
        .then((c) =>
          setForm({
            razon_social: c.razon_social || '',
            tipo_documento: c.tipo_documento || 'NIT',
            numero_identificacion: c.numero_identificacion || '',
            dv: c.dv || '',
            regimen: c.regimen || '',
            pais: c.pais || 'Colombia',
            ciudad: c.ciudad || '',
            direccion: c.direccion || '',
            telefono: c.telefono || '',
            departamento: c.departamento || '',
            codigo_postal: c.codigo_postal || '',
            email: c.email || '',
            responsabilidad_fiscal: c.responsabilidad_fiscal || '',
            detalles_tributarios: c.detalles_tributarios || '',
            vendedor: c.vendedor || '',
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
      const data: ClienteCreate = {
        ...form,
        dv: form.dv || undefined,
        regimen: form.regimen || undefined,
        pais: form.pais || undefined,
        ciudad: form.ciudad || undefined,
        direccion: form.direccion || undefined,
        telefono: form.telefono || undefined,
        departamento: form.departamento || undefined,
        codigo_postal: form.codigo_postal || undefined,
        email: form.email || undefined,
        responsabilidad_fiscal: form.responsabilidad_fiscal || undefined,
        detalles_tributarios: form.detalles_tributarios || undefined,
        vendedor: form.vendedor || undefined,
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

  const handleDepartamentoChange = (dep: string) => {
    setForm((f) => ({ ...f, departamento: dep, ciudad: '' }))
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">
        {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
      </h1>
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700">Razón Social *</label>
          <input
            type="text"
            value={form.razon_social}
            onChange={(e) => setForm((f) => ({ ...f, razon_social: e.target.value }))}
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Tipo de documento *</label>
            <select
              value={form.tipo_documento}
              onChange={(e) => setForm((f) => ({ ...f, tipo_documento: e.target.value }))}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {TIPOS_DOCUMENTO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Número de identificación *
            </label>
            <input
              type="text"
              value={form.numero_identificacion}
              onChange={(e) => setForm((f) => ({ ...f, numero_identificacion: e.target.value }))}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">DV</label>
            <input
              type="text"
              value={form.dv}
              onChange={(e) => setForm((f) => ({ ...f, dv: e.target.value }))}
              maxLength={5}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Régimen</label>
            <input
              type="text"
              value={form.regimen}
              onChange={(e) => setForm((f) => ({ ...f, regimen: e.target.value }))}
              placeholder="Ej: Común, Simplificado"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">País</label>
            <input
              type="text"
              value={form.pais}
              onChange={(e) => setForm((f) => ({ ...f, pais: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Código Postal</label>
            <input
              type="text"
              value={form.codigo_postal}
              onChange={(e) => setForm((f) => ({ ...f, codigo_postal: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Departamento</label>
            <select
              value={form.departamento}
              onChange={(e) => handleDepartamentoChange(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Seleccione...</option>
              {DEPARTAMENTOS_COLOMBIA.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Ciudad / Municipio</label>
            <select
              value={form.ciudad}
              onChange={(e) => setForm((f) => ({ ...f, ciudad: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              disabled={!form.departamento}
            >
              <option value="">Seleccione...</option>
              {municipiosDisponibles.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
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
            <label className="block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Responsabilidad Fiscal
            </label>
            <input
              type="text"
              value={form.responsabilidad_fiscal}
              onChange={(e) =>
                setForm((f) => ({ ...f, responsabilidad_fiscal: e.target.value }))
              }
              placeholder="Ej: Gran contribuyente, Autorretenedor"
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Vendedor</label>
            <select
              value={form.vendedor}
              onChange={(e) => setForm((f) => ({ ...f, vendedor: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Ninguno</option>
              {VENDEDORES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Detalles Tributarios</label>
          <textarea
            value={form.detalles_tributarios}
            onChange={(e) => setForm((f) => ({ ...f, detalles_tributarios: e.target.value }))}
            rows={3}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
          />
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
