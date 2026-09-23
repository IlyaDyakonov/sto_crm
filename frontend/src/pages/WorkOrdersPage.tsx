import { listWorkOrders } from '../api/endpoints'
import { StatusBlock } from '../components/StatusBlock'
import { WorkOrderList } from '../components/WorkOrderList'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'

export function WorkOrdersPage() {
  const { me } = useUser()
  const { data, loading, error } = useApiResource(listWorkOrders)

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__title-block">
          <h1>Заказ-наряды</h1>
          <p className="page__lead">
            Список доступных ЗН. У рабочего суммы скрыты.
          </p>
        </div>
      </header>

      <div className="card card--flush">
        <StatusBlock
          loading={loading}
          error={error}
          empty={!data?.length}
          emptyText="Нет заказ-нарядов для этой роли"
        >
          <WorkOrderList items={data ?? []} role={me?.role} />
        </StatusBlock>
      </div>
    </section>
  )
}
