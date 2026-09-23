import { Link } from 'react-router-dom'
import { listTasks, listWorkOrders } from '../api/endpoints'
import { StatusBlock } from '../components/StatusBlock'
import { TaskList } from '../components/TaskList'
import { WorkOrderList } from '../components/WorkOrderList'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'

const DASHBOARD_LIMIT = 8

export function DashboardPage() {
  const { me, meLoading, meError } = useUser()
  const workOrders = useApiResource(listWorkOrders)
  const tasks = useApiResource(listTasks)

  const loading = meLoading || workOrders.loading || tasks.loading
  const error = meError || workOrders.error || tasks.error

  const myOrders = (workOrders.data ?? []).slice(0, DASHBOARD_LIMIT)
  const myTasks = (tasks.data ?? []).slice(0, DASHBOARD_LIMIT)

  return (
    <section>
      <h1>Дашборд</h1>
      <StatusBlock loading={loading} error={error}>
        {me && (
          <p>
            {me.full_name} · {me.role}
            {me.branch_id != null ? ` · филиал ${me.branch_id}` : ' · вся сеть'}
          </p>
        )}

        <h2>
          Заказ-наряды{' '}
          <Link to="/work-orders">(все)</Link>
        </h2>
        <WorkOrderList
          items={myOrders}
          role={me?.role}
          emptyText="Нет заказ-нарядов"
        />

        <h2>
          Задачи{' '}
          <Link to="/tasks">(все)</Link>
        </h2>
        <TaskList items={myTasks} emptyText="Нет задач" />
      </StatusBlock>
    </section>
  )
}
