import { useCallback, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  assignWorkOrder,
  changeWorkOrderStatus,
  getWorkOrder,
  listUsers,
} from '../api/endpoints'
import { formatApiError } from '../api/errors'
import type { User, WorkOrderStatus } from '../api/types'
import { StatusBlock } from '../components/StatusBlock'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'
import {
  canAssignWorkOrder,
  canManageWorkOrderHeader,
  canSeeFinance,
  formatMoney,
  nextWorkOrderStatuses,
  WO_STATUS_LABELS,
} from '../lib/roles'

export function WorkOrderDetailPage() {
  const { id } = useParams()
  const workOrderId = Number(id)
  const { userId, me } = useUser()
  const role = me?.role

  const fetcher = useCallback(
    (uid: number) => getWorkOrder(uid, workOrderId),
    [workOrderId],
  )
  const { data: wo, loading, error, reload } = useApiResource(
    fetcher,
    [workOrderId],
  )

  const usersFetcher = useCallback((uid: number) => listUsers(uid), [])
  const usersRes = useApiResource(usersFetcher)

  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [nextStatus, setNextStatus] = useState<WorkOrderStatus | ''>('')
  const [assigneeId, setAssigneeId] = useState<number | ''>('')
  const [note, setNote] = useState('')

  const showMoney = canSeeFinance(role)
  const canStatus = canManageWorkOrderHeader(role)
  const canAssign = canAssignWorkOrder(role)

  const transitions = useMemo(
    () => (wo ? nextWorkOrderStatuses(wo.status) : []),
    [wo],
  )

  const workers = useMemo(() => {
    const all = usersRes.data ?? []
    return all.filter((u: User) => {
      if (u.role !== 'worker' || !u.is_active) return false
      if (!wo) return true
      return u.branch_id === wo.branch_id
    })
  }, [usersRes.data, wo])

  async function onChangeStatus(e: FormEvent) {
    e.preventDefault()
    if (!nextStatus || !wo) return
    setBusy(true)
    setActionError(null)
    try {
      await changeWorkOrderStatus(userId, wo.id, nextStatus, note || undefined)
      setNextStatus('')
      setNote('')
      reload()
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function onAssign(e: FormEvent) {
    e.preventDefault()
    if (assigneeId === '' || !wo) return
    setBusy(true)
    setActionError(null)
    try {
      await assignWorkOrder(userId, wo.id, Number(assigneeId), note || undefined)
      setAssigneeId('')
      setNote('')
      reload()
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  if (!Number.isFinite(workOrderId) || workOrderId <= 0) {
    return (
      <section>
        <p>Некорректный id заказ-наряда.</p>
        <Link to="/work-orders">К списку</Link>
      </section>
    )
  }

  return (
    <section>
      <p>
        <Link to="/work-orders">← К списку</Link>
      </p>
      <StatusBlock loading={loading} error={error}>
        {wo && (
          <>
            <h1>
              ЗН {wo.number}{' '}
              <small>({WO_STATUS_LABELS[wo.status] ?? wo.status})</small>
            </h1>

            <dl>
              <dt>ID</dt>
              <dd>{wo.id}</dd>
              <dt>Филиал</dt>
              <dd>{wo.branch_id}</dd>
              <dt>Клиент</dt>
              <dd>{wo.client_id}</dd>
              <dt>Авто</dt>
              <dd>{wo.vehicle_id}</dd>
              <dt>Название</dt>
              <dd>{wo.title ?? '—'}</dd>
              <dt>Исполнитель</dt>
              <dd>{wo.primary_assignee_id ?? '—'}</dd>
              <dt>Срочность</dt>
              <dd>{wo.urgency}</dd>
              <dt>Гарантия</dt>
              <dd>{wo.is_warranty ? 'да' : 'нет'}</dd>
              {showMoney && (
                <>
                  <dt>Работы</dt>
                  <dd>{formatMoney(wo.total_labor_amount)}</dd>
                  <dt>Запчасти</dt>
                  <dd>{formatMoney(wo.total_parts_amount)}</dd>
                  <dt>Итого</dt>
                  <dd>{formatMoney(wo.total_amount)}</dd>
                </>
              )}
              <dt>Заметки</dt>
              <dd>{wo.notes ?? '—'}</dd>
            </dl>

            <h2>Позиции</h2>
            {wo.items.length === 0 ? (
              <p>Нет позиций</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Тип</th>
                    <th>Кол-во</th>
                    {showMoney && <th>Цена</th>}
                    {showMoney && <th>Сумма</th>}
                    <th>Исполнитель</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {wo.items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.item_type}</td>
                      <td>{item.qty}</td>
                      {showMoney && <td>{formatMoney(item.unit_price)}</td>}
                      {showMoney && <td>{formatMoney(item.amount)}</td>}
                      <td>{item.assignee_id ?? '—'}</td>
                      <td>{item.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(canStatus || canAssign) && (
              <>
                <h2>Действия</h2>
                {actionError && <p>Ошибка: {actionError}</p>}

                {canStatus && (
                  <form onSubmit={onChangeStatus}>
                    <fieldset disabled={busy || transitions.length === 0}>
                      <legend>Сменить статус</legend>
                      {transitions.length === 0 ? (
                        <p>Переходов нет (конечный статус).</p>
                      ) : (
                        <>
                          <select
                            value={nextStatus}
                            onChange={(e) =>
                              setNextStatus(e.target.value as WorkOrderStatus | '')
                            }
                            required
                          >
                            <option value="">— выбрать —</option>
                            {transitions.map((s) => (
                              <option key={s} value={s}>
                                {WO_STATUS_LABELS[s] ?? s}
                              </option>
                            ))}
                          </select>{' '}
                          <input
                            type="text"
                            placeholder="Комментарий"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                          />{' '}
                          <button type="submit">Применить</button>
                        </>
                      )}
                    </fieldset>
                  </form>
                )}

                {canAssign && (
                  <form onSubmit={onAssign}>
                    <fieldset disabled={busy}>
                      <legend>Назначить исполнителя</legend>
                      <select
                        value={assigneeId === '' ? '' : String(assigneeId)}
                        onChange={(e) =>
                          setAssigneeId(
                            e.target.value === '' ? '' : Number(e.target.value),
                          )
                        }
                        required
                      >
                        <option value="">— рабочий филиала —</option>
                        {workers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} (#{u.id})
                          </option>
                        ))}
                      </select>{' '}
                      <button type="submit">Назначить</button>
                      {usersRes.error && (
                        <p>Не удалось загрузить пользователей: {usersRes.error}</p>
                      )}
                    </fieldset>
                  </form>
                )}
              </>
            )}
          </>
        )}
      </StatusBlock>
    </section>
  )
}
