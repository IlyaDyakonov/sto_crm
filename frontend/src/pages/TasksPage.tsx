import { listTasks } from '../api/endpoints'
import { StatusBlock } from '../components/StatusBlock'
import { TaskList } from '../components/TaskList'
import { useApiResource } from '../hooks/useApiResource'

export function TasksPage() {
  const { data, loading, error } = useApiResource(listTasks)

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__title-block">
          <h1>Задачи</h1>
          <p className="page__lead">Задачи, видимые текущей роли.</p>
        </div>
      </header>

      <div className="card card--flush">
        <StatusBlock
          loading={loading}
          error={error}
          empty={!data?.length}
          emptyText="Нет задач для этой роли"
        >
          <TaskList items={data ?? []} />
        </StatusBlock>
      </div>
    </section>
  )
}
