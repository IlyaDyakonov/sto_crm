import type { Task } from '../api/types'
import { Link } from 'react-router-dom'

type Props = {
  items: Task[]
  emptyText?: string
}

export function TaskList({ items, emptyText = 'Нет задач' }: Props) {
  if (!items.length) {
    return <p>{emptyText}</p>
  }

  return (
    <table>
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
            <td>{t.task_type}</td>
            <td>{t.title}</td>
            <td>{t.status}</td>
            <td>{t.assignee_id}</td>
            <td>{t.due_at ? t.due_at.slice(0, 16).replace('T', ' ') : '—'}</td>
            <td>
              {t.work_order_id != null ? (
                <Link to={`/work-orders/${t.work_order_id}`}>#{t.work_order_id}</Link>
              ) : (
                '—'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
