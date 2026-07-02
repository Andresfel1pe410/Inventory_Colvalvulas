import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCliente } from '../hooks/useClientes'
import { PageLoading } from '@/shared/components'
import { useSectionPath } from '@/app/routing/sectionPath'
import type { EstadoCliente } from '../types/cliente.types'

const LABEL_ESTADO: Record<EstadoCliente, string> = {
  enviar: 'Enviar',
  enviar_parcial: 'Enviar Parcial',
  no_enviar: 'No enviar',
  solo_contado: 'Solo De Contado',
}

const COLOR_ESTADO: Record<EstadoCliente, string> = {
  enviar: 'bg-green-100 text-green-800 border-green-300',
  enviar_parcial: 'bg-amber-100 text-amber-800 border-amber-300',
  no_enviar: 'bg-red-100 text-red-800 border-red-300',
  solo_contado: 'bg-slate-100 text-slate-800 border-slate-300',
}

export function ClienteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const sectionPath = useSectionPath()
  const { data: cliente, isLoading } = useCliente(id ? Number(id) : null)

  if (isLoading) {
    return <PageLoading />
  }

  if (!cliente) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
        Cliente no encontrado
        <div className="mt-4">
          <Link to={sectionPath('/clientes')} className="text-primary-600 hover:underline">
            Volver a clientes
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Detalles del cliente</h1>
        <div className="flex gap-2">
          <Link
            to={sectionPath(`/clientes/${cliente.id}/editar`)}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm text-white hover:bg-primary-700"
          >
            Editar
          </Link>
          <button
            onClick={() => navigate(sectionPath('/clientes'))}
            className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Volver
          </button>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado Cliente</p>
            <p className="text-sm text-slate-600">Se aplicará como referencia para los pedidos nuevos.</p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium ${COLOR_ESTADO[cliente.estado_cliente]}`}
          >
            {LABEL_ESTADO[cliente.estado_cliente]}
          </span>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Razón Social</dt>
            <dd className="mt-1 text-slate-900">{cliente.razon_social}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Tipo de documento</dt>
            <dd className="mt-1 text-slate-900">{cliente.tipo_documento}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Número de identificación</dt>
            <dd className="mt-1 text-slate-900">{cliente.numero_identificacion}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">DV</dt>
            <dd className="mt-1 text-slate-900">{cliente.dv || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Régimen</dt>
            <dd className="mt-1 text-slate-900">{cliente.regimen || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">País</dt>
            <dd className="mt-1 text-slate-900">{cliente.pais || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Ciudad</dt>
            <dd className="mt-1 text-slate-900">{cliente.ciudad || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Departamento</dt>
            <dd className="mt-1 text-slate-900">{cliente.departamento || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Código Postal</dt>
            <dd className="mt-1 text-slate-900">{cliente.codigo_postal || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Dirección</dt>
            <dd className="mt-1 text-slate-900">{cliente.direccion || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Teléfono</dt>
            <dd className="mt-1 text-slate-900">{cliente.telefono || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Email</dt>
            <dd className="mt-1 text-slate-900">{cliente.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Responsabilidad Fiscal</dt>
            <dd className="mt-1 text-slate-900">{cliente.responsabilidad_fiscal || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Vendedor</dt>
            <dd className="mt-1 text-slate-900">{cliente.vendedor || '—'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Estado Cliente</dt>
            <dd className="mt-1 text-slate-900">{LABEL_ESTADO[cliente.estado_cliente]}</dd>
          </div>
          {cliente.detalles_tributarios && (
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-slate-500">Detalles Tributarios</dt>
              <dd className="mt-1 whitespace-pre-wrap text-slate-900">
                {cliente.detalles_tributarios}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
