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
import { StatusBadge } from '../components/StatusBadge'
import { StatusBlock } from '../components/StatusBlock'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'
import {
  itemAssigneeLabel,
  woAssigneeLabel,
  woBranchLabel,
  woClientLabel,
  woVehicleLabel,
} from '../lib/labels'
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
      <section className="page">
        <p className="alert alert--error">Некорректный id заказ-наряда.</p>
        <Link to="/work-orders">К списку</Link>
      </section>
    )
  }

  return (
    <section className="page">
      <Link className="page__back" to="/work-orders">
        ← К списку заказ-нарядов
      </Link>

      <StatusBlock loading={loading} error={error}>
        {wo && (
          <div className="stack">
            <header className="page__header">
              <div className="page__title-block">
                <div className="title-with-badge">
                  <h1>ЗН {wo.number}</h1>
                  <StatusBadge status={wo.status} />
                </div>
                <p className="page__lead">{wo.title ?? 'Без названия'}</p>
              </div>
            </header>

            <div className="card">
              <dl className="meta-grid">
                <div>
                  <dt>ID</dt>
                  <dd className="mono">{wo.id}</dd>
                </div>
                <div>
                  <dt>Филиал</dt>
                  <dd>{woBranchLabel(wo)}</dd>
                </div>
                <div>
                  <dt>Клиент</dt>
                  <dd>{woClientLabel(wo)}</dd>
                </div>
                <div>
                  <dt>Авто</dt>
                  <dd className="mono">{woVehicleLabel(wo)}</dd>
                </div>
                <div>
                  <dt>Исполнитель</dt>
                  <dd>{woAssigneeLabel(wo)}</dd>
                </div>
                <div>
                  <dt>Срочность</dt>
                  <dd>{wo.urgency}</dd>
                </div>
                <div>
                  <dt>Гарантия</dt>
                  <dd>{wo.is_warranty ? 'да' : 'нет'}</dd>
                </div>
                <div>
                  <dt>Заметки</dt>
                  <dd>{wo.notes ?? '—'}</dd>
                </div>
              </dl>

              {showMoney && (
                <dl className="meta-grid meta-grid--finance stack-gap">
                  <div>
                    <dt>Работы</dt>
                    <dd className="num">{formatMoney(wo.total_labor_amount)}</dd>
                  </div>
                  <div>
                    <dt>Запчасти</dt>
                    <dd className="num">{formatMoney(wo.total_parts_amount)}</dd>
                  </div>
                  <div>
                    <dt>Итого</dt>
                    <dd>
                      <strong>{formatMoney(wo.total_amount)}</strong>
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="card card--flush">
              <div className="card__header">
                <h2 className="card__title">Позиции</h2>
              </div>
              {wo.items.length === 0 ? (
                <p className="empty-hint">Нет позиций</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Название</th>
                        <th>Тип</th>
                        <th className="num">Кол-во</th>
                        {showMoney && <th className="num">Цена</th>}
                        {showMoney && <th className="num">Сумма</th>}
                        <th>Исполнитель</th>
                        <th>Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wo.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.title}</td>
                          <td>
                            <span className="badge badge--neutral">
                              {item.item_type}
                            </span>
                          </td>
                          <td className="num">{item.qty}</td>
                          {showMoney && (
                            <td className="num">{formatMoney(item.unit_price)}</td>
                          )}
                          {showMoney && (
                            <td className="num">{formatMoney(item.amount)}</td>
                          )}
                          <td>{itemAssigneeLabel(item)}</td>
                          <td>
                            <span className="badge badge--info">{item.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {(canStatus || canAssign) && (
              <div className="card">
                <div className="section-head">
                  <h2>Действия</h2>
                  <span className="muted">только director / branch_manager</span>
                </div>

                <div className="actions-stack">
                  {actionError && (
                    <p className="alert alert--error" role="alert">
                      {actionError}
                    </p>
                  )}

                  {canStatus && (
                    <form className="form-panel" onSubmit={onChangeStatus}>
                      <fieldset disabled={busy || transitions.length === 0}>
                        <legend>Сменить статус</legend>
                        {transitions.length === 0 ? (
                          <p className="muted">Переходов нет (конечный статус).</p>
                        ) : (
                          <div className="form-row">
                            <select
                              className="select"
                              value={nextStatus}
                              onChange={(e) =>
                                setNextStatus(
                                  e.target.value as WorkOrderStatus | '',
                                )
                              }
                              required
                              aria-label="Новый статус"
                            >
                              <option value="">— выбрать —</option>
                              {transitions.map((s) => (
                                <option key={s} value={s}>
                                  {WO_STATUS_LABELS[s] ?? s}
                                </option>
                              ))}
                            </select>
                            <input
                              className="input input--grow"
                              type="text"
                              placeholder="Комментарий"
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                            />
                            <button className="btn" type="submit" disabled={busy}>
                              Применить
                            </button>
                          </div>
                        )}
                      </fieldset>
                    </form>
                  )}

                  {canAssign && (
                    <form className="form-panel" onSubmit={onAssign}>
                      <fieldset disabled={busy}>
                        <legend>Назначить исполнителя</legend>
                        <div className="form-row">
                          <select
                            className="select input--grow"
                            value={assigneeId === '' ? '' : String(assigneeId)}
                            onChange={(e) =>
                              setAssigneeId(
                                e.target.value === ''
                                  ? ''
                                  : Number(e.target.value),
                              )
                            }
                            required
                            aria-label="Исполнитель"
                          >
                            <option value="">— рабочий филиала —</option>
                            {workers.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.full_name} (#{u.id})
                              </option>
                            ))}
                          </select>
                          <button className="btn" type="submit" disabled={busy}>
                            Назначить
                          </button>
                        </div>
                        {usersRes.error && (
                          <p className="alert alert--error stack-gap">
                            Не удалось загрузить пользователей: {usersRes.error}
                          </p>
                        )}
                      </fieldset>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </StatusBlock>
    </section>
  )
}
