import { PageLoading } from '@/shared/components'
import { InventarioProcesoTable } from '../components/InventarioProcesoTable'
import { useInventarioProcesoList } from '../hooks/useInventarioProceso'

export function InventarioProcesoPage() {
  const {
    data: invData = [],
    isLoading,
    isFetching: fetchingInv,
    refetch: refetchInv,
  } = useInventarioProcesoList({
    limit: 10000,
  })
  const isRefreshing = fetchingInv

  const handleRefresh = () => refetchInv()

  const handleMovimientoCreated = () => {
    refetchInv()
  }

  if (isLoading) {
    return <PageLoading />
  }

  return (
    <div className="space-y-6">
      <InventarioProcesoTable
        data={invData}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onMovimientoCreated={handleMovimientoCreated}
      />
    </div>
  )
}