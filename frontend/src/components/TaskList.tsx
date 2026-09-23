import { Link } from 'react-router-dom'
import type { Task } from '../api/types'

type Props = {
  items: Task[]
  emptyText?: string
}

export function TaskList({ items, emptyText = 'Нет задач' }: Props) {
  if (!items.length) {
    return <p className="empty-hint">{emptyText}</p>
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Тип</th>
            <th>Название</th>
            <th>Статус</th>
            <th>Исполнитель</th>
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
                <span className="badge badge--info">{t.status}</span>
              </td>
              <td>{t.assignee_id != null ? `#${t.assignee_id}` : '—'}</td>
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
