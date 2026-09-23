import { useState } from 'react'
import { Link } from 'react-router-dom'
import { updateTask } from '../api/endpoints'
import { formatApiError } from '../api/errors'
import type { Task, TaskStatus } from '../api/types'
import { useUser } from '../context/UserContext'

const TASK_STATUSES: TaskStatus[] = [
  'open',
  'in_progress',
  'done',
  'cancelled',
]

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
  done: 'Готово',
  cancelled: 'Отменена',
}

type Props = {
  items: Task[]
  emptyText?: string
  onChanged?: () => void
}

export function TaskList({
  items,
  emptyText = 'Нет задач',
  onChanged,
}: Props) {
  const { userId } = useUser()
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onStatusChange(task: Task, status: TaskStatus) {
    if (status === task.status) return
    setBusyId(task.id)
    setError(null)
    try {
      await updateTask(userId, task.id, { status })
      onChanged?.()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusyId(null)
    }
  }

  if (!items.length) {
    return <p className="empty-hint">{emptyText}</p>
  }

  return (
    <div className="table-wrap">
      {error && (
        <p className="alert alert--error" role="alert">
          {error}
        </p>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th>Тип</th>
            <th>Название</th>
            <th>Статус</th>
            <th>Исполнитель</th>
            <th>Создал</th>
            <th>Срок</th>
            <th>ЗН</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td>
                <span className="badge badge--neutral">{t.task_type}</span>
              </td>
              <td>{t.title}</td>
              <td>
                <select
                  className="select"
                  value={t.status}
                  disabled={busyId === t.id}
                  aria-label={`Статус задачи ${t.id}`}
                  onChange={(e) =>
                    onStatusChange(t, e.target.value as TaskStatus)
                  }
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {TASK_STATUS_LABELS[s] ?? s}
                    </option>
                  ))}
                  {!TASK_STATUSES.includes(t.status as TaskStatus) && (
                    <option value={t.status}>{t.status}</option>
                  )}
                </select>
              </td>
              <td>{t.assignee_id != null ? `#${t.assignee_id}` : '—'}</td>
              <td>{t.created_by != null ? `#${t.created_by}` : '—'}</td>
              <td className="mono">
                {t.due_at ? t.due_at.slice(0, 16).replace('T', ' ') : '—'}
              </td>
              <td>
                {t.work_order_id != null ? (
                  <Link className="row-link" to={`/work-orders/${t.work_order_id}`}>
                    #{t.work_order_id}
                  </Link>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
