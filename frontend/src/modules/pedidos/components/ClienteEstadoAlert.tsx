import { useCliente } from '@/modules/clientes/hooks/useClientes'
import { ESTADO_CLIENTE_LABELS } from '@/modules/clientes/types/cliente.types'
import type { EstadoCliente } from '@/modules/clientes/types/cliente.types'

const ESTILOS_ESTADO: Record<EstadoCliente, string> = {
  enviar: 'border-green-300 bg-green-50 text-green-800',
  enviar_parcial: 'border-amber-300 bg-amber-50 text-amber-800',
  no_enviar: 'border-red-300 bg-red-50 text-red-800',
  solo_contado: 'border-slate-300 bg-slate-100 text-slate-800',
}

interface ClienteEstadoAlertProps {
  clienteId: number | ''
}

export function ClienteEstadoAlert({ clienteId }: ClienteEstadoAlertProps) {
  const { data: cliente } = useCliente(typeof clienteId === 'number' ? clienteId : null)

  if (!cliente) return null

  const montoFormateado =
    cliente.estado_cliente === 'enviar_parcial' && cliente.monto_maximo_parcial != null
      ? new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0,
        }).format(cliente.monto_maximo_parcial)
      : null

  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm font-medium ${ESTILOS_ESTADO[cliente.estado_cliente]}`}
    >
      <span>Estado del cliente: {ESTADO_CLIENTE_LABELS[cliente.estado_cliente]}</span>
      {montoFormateado && (
        <span className="ml-2 font-semibold text-amber-900 underline decoration-amber-400">
          (Monto máx: {montoFormateado})
        </span>
      )}
    </div>
  )
}
