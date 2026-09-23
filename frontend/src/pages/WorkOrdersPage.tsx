import { listWorkOrders } from '../api/endpoints'
import { StatusBlock } from '../components/StatusBlock'
import { WorkOrderList } from '../components/WorkOrderList'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'

export function WorkOrdersPage() {
  const { me } = useUser()
  const { data, loading, error } = useApiResource(listWorkOrders)

  return (
    <section>
      <h1>Заказ-наряды</h1>
      <StatusBlock
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyText="Нет заказ-нарядов для этой роли"
      >
        <WorkOrderList items={data ?? []} role={me?.role} />
      </StatusBlock>
    </section>
  )
}
