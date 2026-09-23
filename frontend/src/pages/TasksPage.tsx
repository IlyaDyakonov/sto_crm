import { listTasks } from '../api/endpoints'
import { StatusBlock } from '../components/StatusBlock'
import { TaskList } from '../components/TaskList'
import { useApiResource } from '../hooks/useApiResource'

export function TasksPage() {
  const { data, loading, error } = useApiResource(listTasks)

  return (
    <section>
      <h1>Задачи</h1>
      <StatusBlock
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyText="Нет задач для этой роли"
      >
        <TaskList items={data ?? []} />
      </StatusBlock>
    </section>
  )
}
