import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DataTable,
  ConfirmDialog,
  CopyableCell,
  PageLoading,
} from '@/shared/components'
import { useSectionPath } from '@/app/routing/sectionPath'
import { useAuthStore } from '@/modules/auth/store/authStore'
import { useClientesList, useClienteDelete, useClienteUpdate } from '../hooks/useClientes'
import { ModalMontoParcial } from '../components/ModalMontoParcial'
import type { Cliente, EstadoCliente } from '../types/cliente.types'

const ESTADOS_CLIENTE: { value: EstadoCliente; label: string }[] = [
  { value: 'enviar', label: 'Enviar' },
  { value: 'enviar_parcial', label: 'Enviar Parcial' },
  { value: 'no_enviar', label: 'No enviar' },
  { value: 'solo_contado', label: 'Solo De Contado' },
]

const COLOR_ESTADO: Record<EstadoCliente, string> = {
  enviar: 'bg-green-100 text-green-800 border-green-300',
  enviar_parcial: 'bg-amber-100 text-amber-800 border-amber-300',
  no_enviar: 'bg-red-100 text-red-800 border-red-300',
  solo_contado: 'bg-slate-100 text-slate-800 border-slate-300',
}

export function ClientesListPage() {
  const sectionPath = useSectionPath()
  const isAdmin = useAuthStore((s) => s.user?.roles?.includes('admin')) ?? false
  const isAuditorContable = useAuthStore((s) => s.user?.roles?.includes('auditor_contable')) ?? false
  const [search, setSearch] = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [modalCliente, setModalCliente] = useState<Cliente | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: clientes = [], isLoading } = useClientesList({
    search: searchDebounced.trim() || undefined,
    limit: 10000,
  })
  const deleteMutation = useClienteDelete()
  const updateMutation = useClienteUpdate()

  const handleEstadoChange = async (cliente: Cliente, estado_cliente: EstadoCliente) => {
    if (estado_cliente === 'enviar_parcial') {
      setModalCliente(cliente)
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: cliente.id,
        data: {
          estado_cliente,
          monto_maximo_parcial: null,
        },
      })
    } catch {
      // Error manejado por interceptor
    }
  }

  const handleConfirmMontoParcial = async (monto: number) => {
    if (!modalCliente) return
    try {
      await updateMutation.mutateAsync({
        id: modalCliente.id,
        data: {
          estado_cliente: 'enviar_parcial',
          monto_maximo_parcial: monto,
        },
      })
    } catch {
      // Error manejado por interceptor
    } finally {
      setModalCliente(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await deleteMutation.mutateAsync(deleteId)
      setDeleteId(null)
    } catch {
      setDeleteId(null)
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            placeholder="Buscar por número de documento o razón social..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm sm:w-64"
          />
          {isAdmin && (
            <Link
              to={sectionPath('/clientes/nuevo')}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Nuevo cliente
            </Link>
          )}
        </div>
      </div>
      {isLoading ? (
        <PageLoading />
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: 'tipo_documento',
                header: 'Tipo Doc.',
                width: '80px',
                render: (c) => <CopyableCell value={c.tipo_documento} truncate={false} />,
              },
              {
                key: 'numero_identificacion',
                header: 'Nº Documento',
                width: '120px',
                render: (c) => (
                  <CopyableCell value={c.numero_identificacion} maxWidth="100px" truncate />
                ),
              },
              {
                key: 'razon_social',
                header: 'Razón Social',
                width: '280px',
                render: (c) => (
                  <CopyableCell value={c.razon_social} maxWidth="260px" truncate />
                ),
              },
              {
                key: 'estado_cliente',
                header: 'Estado Cliente',
                width: '180px',
                render: (c) => (
                  <div className="flex flex-col items-start gap-1">
                    <select
                      value={c.estado_cliente}
                      onChange={(e) => handleEstadoChange(c, e.target.value as EstadoCliente)}
                      disabled={updateMutation.isPending || !isAuditorContable}
                      className={`rounded-md border px-2 py-1 text-sm ${COLOR_ESTADO[c.estado_cliente]}`}
                    >
                      {ESTADOS_CLIENTE.map((estado) => (
                        <option key={estado.value} value={estado.value}>
                          {estado.label}
                        </option>
                      ))}
                    </select>
                    {c.estado_cliente === 'enviar_parcial' && (
                      <button
                        type="button"
                        onClick={() => setModalCliente(c)}
                        disabled={!isAuditorContable}
                        title={isAuditorContable ? 'Hacer clic para editar monto máximo' : undefined}
                        className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-200 transition-colors"
                      >
                        <span>
                          {c.monto_maximo_parcial != null && c.monto_maximo_parcial > 0
                            ? `Máx: ${new Intl.NumberFormat('es-CO', {
                                style: 'currency',
                                currency: 'COP',
                                maximumFractionDigits: 0,
                              }).format(c.monto_maximo_parcial)}`
                            : 'Definir monto'}
                        </span>
                        {isAuditorContable && (
                          <svg className="h-3 w-3 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                ),
              },
              {
                key: 'departamento',
                header: 'Departamento',
                width: '140px',
                render: (c) => (
                  <CopyableCell value={c.departamento || ''} maxWidth="120px" truncate />
                ),
              },
              {
                key: 'ciudad',
                header: 'Ciudad',
                width: '140px',
                render: (c) => (
                  <CopyableCell value={c.ciudad || ''} maxWidth="120px" truncate />
                ),
              },
              {
                key: 'email',
                header: 'Correo',
                width: '200px',
                render: (c) => (
                  <CopyableCell value={c.email || ''} maxWidth="180px" truncate />
                ),
              },
              {
                key: 'telefono',
                header: 'Teléfono',
                width: '110px',
                render: (c) => (
                  <CopyableCell value={c.telefono || ''} maxWidth="90px" truncate />
                ),
              },
              {
                key: 'vendedor',
                header: 'Vendedor',
                width: '80px',
                render: (c) => <CopyableCell value={c.vendedor || ''} truncate={false} />,
              },
              {
                key: 'actions',
                header: 'Acciones',
                width: '180px',
                render: (c) => (
                  <div className="flex gap-2">
                    <Link
                      to={sectionPath(`/clientes/${c.id}`)}
                      className="text-primary-600 hover:underline"
                    >
                      Detalles
                    </Link>
                    {isAdmin && (
                      <Link
                        to={sectionPath(`/clientes/${c.id}/editar`)}
                        className="text-primary-600 hover:underline"
                      >
                        Editar
                      </Link>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="text-red-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
            data={clientes}
            keyExtractor={(c) => c.id}
          />
          <p className="mt-2 text-sm text-slate-600">
            Total: {clientes.length} registro{clientes.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
      <ConfirmDialog
        open={deleteId !== null}
        title="Eliminar cliente"
        message="¿Está seguro de eliminar este cliente?"
        confirmLabel="Eliminar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
      <ModalMontoParcial
        isOpen={modalCliente !== null}
        clienteNombre={modalCliente?.razon_social}
        valorInicial={modalCliente?.monto_maximo_parcial}
        onClose={() => setModalCliente(null)}
        onConfirm={handleConfirmMontoParcial}
      />
    </div>
  )
}
