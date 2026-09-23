import { useCallback, useState, type FormEvent } from 'react'
import { createTask, listTasks, listUsers, listWorkOrders } from '../api/endpoints'
import { formatApiError } from '../api/errors'
import { StatusBlock } from '../components/StatusBlock'
import { TaskList } from '../components/TaskList'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'
import { canManageWorkOrderHeader } from '../lib/roles'

const TASK_TYPES = [
  { value: 'callback', label: 'Перезвонить' },
  { value: 'approve_extras', label: 'Согласовать допы' },
  { value: 'remind_service', label: 'Напомнить про ТО' },
  { value: 'pickup', label: 'Выдача / забрать' },
  { value: 'escalation', label: 'Эскалация' },
  { value: 'other', label: 'Другое' },
] as const

export function TasksPage() {
  const { userId, me } = useUser()
  const canCreate = canManageWorkOrderHeader(me?.role)
  const { data, loading, error, reload } = useApiResource(listTasks)

  const usersFetcher = useCallback(
    (uid: number) => (canCreate ? listUsers(uid) : Promise.resolve([])),
    [canCreate],
  )
  const users = useApiResource(usersFetcher, [canCreate])

  const woFetcher = useCallback(
    (uid: number) => (canCreate ? listWorkOrders(uid) : Promise.resolve([])),
    [canCreate],
  )
  const workOrders = useApiResource(woFetcher, [canCreate])

  const [title, setTitle] = useState('')
  const [taskType, setTaskType] = useState<string>('other')
  const [assigneeId, setAssigneeId] = useState<number | ''>('')
  const [workOrderId, setWorkOrderId] = useState<number | ''>('')
  const [dueAt, setDueAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const assignees = (users.data ?? []).filter((u) => u.is_active)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!canCreate || assigneeId === '') return
    setBusy(true)
    setFormError(null)
    try {
      await createTask(userId, {
        title: title.trim(),
        task_type: taskType,
        assignee_id: Number(assigneeId),
        branch_id: me?.branch_id ?? null,
        work_order_id: workOrderId === '' ? null : Number(workOrderId),
        due_at: dueAt.trim() ? new Date(dueAt).toISOString() : null,
      })
      setTitle('')
      setTaskType('other')
      setAssigneeId('')
      setWorkOrderId('')
      setDueAt('')
      reload()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__title-block">
          <h1>Задачи</h1>
          <p className="page__lead">
            Видны создателю и исполнителю. Статус можно менять в списке.
          </p>
        </div>
      </header>

      <div className="stack">
        {canCreate && (
          <div className="card">
            <div className="section-head">
              <h2>Новая задача</h2>
              <span className="muted">напоминание, поручение мастеру и т.п.</span>
            </div>
            {formError && (
              <p className="alert alert--error" role="alert">
                {formError}
              </p>
            )}
            <form className="form-grid" onSubmit={onCreate}>
              <label className="field field--wide">
                <span>Название</span>
                <input
                  className="input"
                  required
                  placeholder="Напомнить про ТО через полгода / отогнать на мойку…"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Тип</span>
                <select
                  className="select"
                  value={taskType}
                  onChange={(e) => setTaskType(e.target.value)}
                >
                  {TASK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Кому</span>
                <select
                  className="select"
                  required
                  value={assigneeId === '' ? '' : String(assigneeId)}
                  onChange={(e) =>
                    setAssigneeId(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                >
                  <option value="">— выбрать —</option>
                  {assignees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} (#{u.id}, {u.role})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Срок</span>
                <input
                  className="input"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </label>
              <label className="field">
                <span>ЗН (опционально)</span>
                <select
                  className="select"
                  value={workOrderId === '' ? '' : String(workOrderId)}
                  onChange={(e) =>
                    setWorkOrderId(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                >
                  <option value="">— без ЗН —</option>
                  {(workOrders.data ?? []).map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.number} · {wo.title ?? 'без названия'}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field">
                <span>&nbsp;</span>
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? 'Создание…' : 'Создать задачу'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card card--flush">
          <StatusBlock
            loading={loading}
            error={error}
            empty={!data?.length}
            emptyText="Нет задач для этой роли"
          >
            <TaskList items={data ?? []} onChanged={reload} />
          </StatusBlock>
        </div>
      </div>
    </section>
  )
}
