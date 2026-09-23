import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  changeWorkOrderStatus,
  createWorkOrder,
  getWorkOrder,
  listBranches,
  listClients,
  listUsers,
  listVehicles,
  updateWorkOrder,
  updateWorkOrderItem,
} from '../api/endpoints'
import { formatApiError } from '../api/errors'
import type {
  User,
  WorkOrder,
  WorkOrderItemWrite,
  WorkOrderStatus,
} from '../api/types'
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
  canManageWorkOrderHeader,
  canSeeFinance,
  canUpdateWorkOrderItemStatus,
  formatMoney,
  isWorker,
  nextWorkOrderStatuses,
  WO_ITEM_STATUS_LABELS,
  WO_ITEM_STATUSES,
  WO_STATUS_LABELS,
  type WorkOrderItemStatus,
} from '../lib/roles'

type ItemDraft = {
  key: string
  id?: number
  title: string
  item_type: 'labor' | 'part'
  qty: string
  unit_price: string
  status: WorkOrderItemStatus
}

type FormState = {
  branch_id: number | ''
  client_id: number | ''
  vehicle_id: number | ''
  title: string
  primary_assignee_id: number | ''
  is_warranty: boolean
  urgency: string
  notes: string
  items: ItemDraft[]
}

function emptyItem(): ItemDraft {
  return {
    key: `new-${Math.random().toString(36).slice(2, 9)}`,
    title: '',
    item_type: 'labor',
    qty: '1',
    unit_price: '0',
    status: 'pending',
  }
}

function formFromWo(wo: WorkOrder): FormState {
  return {
    branch_id: wo.branch_id,
    client_id: wo.client_id,
    vehicle_id: wo.vehicle_id,
    title: wo.title ?? '',
    primary_assignee_id: wo.primary_assignee_id ?? '',
    is_warranty: wo.is_warranty,
    urgency: wo.urgency || 'normal',
    notes: wo.notes ?? '',
    items: wo.items.map((it) => ({
      key: `id-${it.id}`,
      id: it.id,
      title: it.title,
      item_type: it.item_type === 'part' ? 'part' : 'labor',
      qty: String(it.qty),
      unit_price: String(it.unit_price ?? '0'),
      status: (WO_ITEM_STATUSES.includes(it.status as WorkOrderItemStatus)
        ? it.status
        : 'pending') as WorkOrderItemStatus,
    })),
  }
}

function defaultForm(branchId: number | '' = ''): FormState {
  return {
    branch_id: branchId,
    client_id: '',
    vehicle_id: '',
    title: '',
    primary_assignee_id: '',
    is_warranty: false,
    urgency: 'normal',
    notes: '',
    items: [emptyItem()],
  }
}

function toItemWrites(items: ItemDraft[]): WorkOrderItemWrite[] {
  return items
    .filter((it) => it.title.trim())
    .map((it, idx) => ({
      id: it.id,
      title: it.title.trim(),
      item_type: it.item_type,
      qty: Number(it.qty) || 0,
      unit_price: Number(it.unit_price) || 0,
      status: it.status,
      sort_order: idx,
    }))
}

export function WorkOrderDetailPage() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  // /work-orders/new не имеет :id в params — ловим и param, и pathname
  const isNew = id === 'new' || /\/work-orders\/new\/?$/.test(location.pathname)
  const workOrderId = isNew ? null : Number(id)
  const { userId, me } = useUser()
  const role = me?.role
  const canEdit = canManageWorkOrderHeader(role)
  const showMoney = canSeeFinance(role)

  const woFetcher = useCallback(
    (uid: number) => {
      if (isNew || workOrderId == null || !Number.isFinite(workOrderId)) {
        return Promise.resolve(null)
      }
      return getWorkOrder(uid, workOrderId)
    },
    [isNew, workOrderId],
  )
  const {
    data: wo,
    loading: woLoading,
    error: woError,
    reload,
  } = useApiResource(woFetcher, [isNew, workOrderId])

  const refsFetcher = useCallback(
    async (uid: number) => {
      if (!canEdit && !isNew) {
        return { branches: [], clients: [], vehicles: [], workers: [] as User[] }
      }
      const [branches, clients, vehicles, workers] = await Promise.all([
        listBranches(uid),
        listClients(uid),
        listVehicles(uid),
        listUsers(uid, { role: 'worker' }),
      ])
      return { branches, clients, vehicles, workers }
    },
    [canEdit, isNew],
  )
  const refs = useApiResource(refsFetcher, [canEdit, isNew])

  const [form, setForm] = useState<FormState>(() => defaultForm())
  const [hydrated, setHydrated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [nextStatus, setNextStatus] = useState<WorkOrderStatus | ''>('')

  {/* Начальные значения формы */}
  useEffect(() => {
    if (isNew) {
      const branchDefault =
        role === 'branch_manager' && me?.branch_id != null
          ? me.branch_id
          : ''
      setForm(defaultForm(branchDefault))
      setHydrated(true)
      return
    }
    if (wo) {
      setForm(formFromWo(wo))
      setNextStatus(wo.status)
      setHydrated(true)
    }
  }, [isNew, wo, role, me?.branch_id])

  const branchIdNum =
    form.branch_id === '' ? null : Number(form.branch_id)

  const clientVehicles = useMemo(() => {
    const all = refs.data?.vehicles ?? []
    if (form.client_id === '') return []
    return all.filter((v) => v.client_id === Number(form.client_id))
  }, [refs.data?.vehicles, form.client_id])

  const branchWorkers = useMemo(() => {
    const all = refs.data?.workers ?? []
    if (branchIdNum == null) return []
    return all.filter(
      (u) => u.role === 'worker' && u.is_active && u.branch_id === branchIdNum,
    )
  }, [refs.data?.workers, branchIdNum])

  const transitions = useMemo(
    () => (wo ? nextWorkOrderStatuses(wo.status) : []),
    [wo],
  )

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }))
  }

  function onClientChange(clientId: number | '') {
    setForm((prev) => {
      const vehicles = (refs.data?.vehicles ?? []).filter(
        (v) => clientId !== '' && v.client_id === Number(clientId),
      )
      const keepVehicle =
        clientId !== '' &&
        prev.vehicle_id !== '' &&
        vehicles.some((v) => v.id === prev.vehicle_id)
      return {
        ...prev,
        client_id: clientId,
        vehicle_id: keepVehicle ? prev.vehicle_id : '',
      }
    })
  }

  function onBranchChange(branchId: number | '') {
    setForm((prev) => {
      const workers = (refs.data?.workers ?? []).filter(
        (u) =>
          branchId !== '' &&
          u.branch_id === Number(branchId) &&
          u.role === 'worker',
      )
      const keepAssignee =
        prev.primary_assignee_id !== '' &&
        workers.some((u) => u.id === prev.primary_assignee_id)
      return {
        ...prev,
        branch_id: branchId,
        primary_assignee_id: keepAssignee ? prev.primary_assignee_id : '',
      }
    })
  }

  function updateItem(key: string, patch: Partial<ItemDraft>) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    }))
  }

  function removeItem(key: string) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((it) => it.key !== key),
    }))
  }

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!canEdit) return
    if (form.branch_id === '' || form.client_id === '' || form.vehicle_id === '') {
      setActionError('Укажите филиал, клиента и авто')
      return
    }
    setBusy(true)
    setActionError(null)
    const items = toItemWrites(form.items)
    const payload = {
      branch_id: Number(form.branch_id),
      client_id: Number(form.client_id),
      vehicle_id: Number(form.vehicle_id),
      title: form.title.trim() || null,
      primary_assignee_id:
        form.primary_assignee_id === ''
          ? null
          : Number(form.primary_assignee_id),
      is_warranty: form.is_warranty,
      urgency: form.urgency,
      notes: form.notes.trim() || null,
      items,
    }
    try {
      if (isNew) {
        const created = await createWorkOrder(userId, payload)
        navigate(`/work-orders/${created.id}`, { replace: true })
      } else if (workOrderId != null) {
        await updateWorkOrder(userId, workOrderId, payload)
        reload()
      }
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function onChangeStatus(e: FormEvent) {
    e.preventDefault()
    if (!nextStatus || !wo || !canEdit || nextStatus === wo.status) return
    setBusy(true)
    setActionError(null)
    try {
      await changeWorkOrderStatus(userId, wo.id, nextStatus)
      reload()
    } catch (err) {
      setActionError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  if (!isNew && (workOrderId == null || !Number.isFinite(workOrderId) || workOrderId <= 0)) {
    return (
      <section className="page">
        <p className="alert alert--error">Некорректный id заказ-наряда.</p>
        <Link to="/work-orders">К списку</Link>
      </section>
    )
  }

  if (isNew && !canEdit) {
    return (
      <section className="page">
        <p className="alert alert--error">Создание ЗН недоступно для этой роли.</p>
        <Link to="/work-orders">К списку</Link>
      </section>
    )
  }

  const loading = (!isNew && woLoading) || (canEdit && refs.loading) || !hydrated
  const error = woError || (canEdit ? refs.error : null)
  const readonly = !canEdit

  return (
    <section className="page">
      <Link className="page__back" to="/work-orders">
        ← К списку заказ-нарядов
      </Link>

      <StatusBlock loading={loading} error={error}>
        {(isNew || wo) && (
          <div className="stack">
            <header className="page__header">
              <div className="page__title-block">
                <div className="title-with-badge">
                  <h1>
                    {isNew
                      ? 'Новый заказ-наряд'
                      : `ЗН ${wo?.number ?? ''}`}
                  </h1>
                  {wo && <StatusBadge status={wo.status} />}
                </div>
                <p className="page__lead">
                  {canEdit
                    ? isNew
                      ? 'Заполните данные и сохраните.'
                      : 'Редактирование данных ЗН.'
                    : (wo?.title ?? 'Без названия')}
                </p>
              </div>
            </header>

            {readonly && wo ? (
              <ReadonlyWorkOrder
                wo={wo}
                showMoney={showMoney}
                canEditItemStatus={isWorker(role)}
                onItemStatusChanged={reload}
              />
            ) : (
              <form className="stack" onSubmit={onSave}>
                <div className="card">
                  <div className="section-head">
                    <h2>Основные данные</h2>
                  </div>
                  <div className="form-grid">
                    <label className="field">
                      <span>Филиал</span>
                      {role === 'branch_manager' ? (
                        <input
                          className="input"
                          disabled
                          value={
                            refs.data?.branches.find(
                              (b) => b.id === form.branch_id,
                            )?.name ??
                            (form.branch_id !== ''
                              ? `филиал #${form.branch_id}`
                              : '')
                          }
                        />
                      ) : (
                        <select
                          className="select"
                          required
                          value={form.branch_id === '' ? '' : String(form.branch_id)}
                          onChange={(e) =>
                            onBranchChange(
                              e.target.value === ''
                                ? ''
                                : Number(e.target.value),
                            )
                          }
                        >
                          <option value="">— выбрать —</option>
                          {(refs.data?.branches ?? []).map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>

                    <label className="field">
                      <span>Клиент</span>
                      <select
                        className="select"
                        required
                        value={
                          form.client_id === '' ? '' : String(form.client_id)
                        }
                        onChange={(e) =>
                          onClientChange(
                            e.target.value === ''
                              ? ''
                              : Number(e.target.value),
                          )
                        }
                      >
                        <option value="">— выбрать —</option>
                        {(refs.data?.clients ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (#{c.id})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Авто</span>
                      <select
                        className="select"
                        required
                        disabled={form.client_id === ''}
                        value={
                          form.vehicle_id === '' ? '' : String(form.vehicle_id)
                        }
                        onChange={(e) =>
                          patchForm({
                            vehicle_id:
                              e.target.value === ''
                                ? ''
                                : Number(e.target.value),
                          })
                        }
                      >
                        <option value="">
                          {form.client_id === ''
                            ? '— сначала клиент —'
                            : '— выбрать —'}
                        </option>
                        {clientVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.plate_number} · {v.make} {v.model}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Исполнитель</span>
                      <select
                        className="select"
                        value={
                          form.primary_assignee_id === ''
                            ? ''
                            : String(form.primary_assignee_id)
                        }
                        onChange={(e) =>
                          patchForm({
                            primary_assignee_id:
                              e.target.value === ''
                                ? ''
                                : Number(e.target.value),
                          })
                        }
                      >
                        <option value="">— не назначен —</option>
                        {branchWorkers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name} (#{u.id})
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Название</span>
                      <input
                        className="input"
                        value={form.title}
                        onChange={(e) => patchForm({ title: e.target.value })}
                      />
                    </label>

                    <label className="field">
                      <span>Срочность</span>
                      <select
                        className="select"
                        value={form.urgency}
                        onChange={(e) => patchForm({ urgency: e.target.value })}
                      >
                        <option value="normal">normal</option>
                        <option value="high">high</option>
                        <option value="tow">tow</option>
                      </select>
                    </label>

                    <label className="field field--check">
                      <span>Гарантия</span>
                      <input
                        type="checkbox"
                        checked={form.is_warranty}
                        onChange={(e) =>
                          patchForm({ is_warranty: e.target.checked })
                        }
                      />
                    </label>

                    <label className="field field--wide">
                      <span>Заметки</span>
                      <textarea
                        className="input"
                        rows={2}
                        value={form.notes}
                        onChange={(e) => patchForm({ notes: e.target.value })}
                      />
                    </label>
                  </div>

                  {wo && showMoney && (
                    <dl className="meta-grid meta-grid--finance stack-gap">
                      <div>
                        <dt>Работы</dt>
                        <dd className="num">
                          {formatMoney(wo.total_labor_amount)}
                        </dd>
                      </div>
                      <div>
                        <dt>Запчасти</dt>
                        <dd className="num">
                          {formatMoney(wo.total_parts_amount)}
                        </dd>
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
                    <h2 className="card__title">Позиции (работы / запчасти)</h2>
                    <button
                      className="btn btn--secondary"
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          items: [...prev.items, emptyItem()],
                        }))
                      }
                    >
                      + Позиция
                    </button>
                  </div>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Название</th>
                          <th>Тип</th>
                          <th className="num">Кол-во</th>
                          <th className="num">Цена</th>
                          <th>Статус</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((it) => (
                          <tr key={it.key}>
                            <td>
                              <input
                                className="input"
                                value={it.title}
                                onChange={(e) =>
                                  updateItem(it.key, { title: e.target.value })
                                }
                                required={form.items.length === 1}
                                placeholder="Название"
                              />
                            </td>
                            <td>
                              <select
                                className="select"
                                value={it.item_type}
                                onChange={(e) =>
                                  updateItem(it.key, {
                                    item_type: e.target.value as
                                      | 'labor'
                                      | 'part',
                                  })
                                }
                              >
                                <option value="labor">labor</option>
                                <option value="part">part</option>
                              </select>
                            </td>
                            <td className="num">
                              <input
                                className="input input--num"
                                type="number"
                                min="0"
                                step="0.01"
                                value={it.qty}
                                onChange={(e) =>
                                  updateItem(it.key, { qty: e.target.value })
                                }
                              />
                            </td>
                            <td className="num">
                              <input
                                className="input input--num"
                                type="number"
                                min="0"
                                step="0.01"
                                value={it.unit_price}
                                onChange={(e) =>
                                  updateItem(it.key, {
                                    unit_price: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>
                              <span className="badge badge--info">
                                {WO_ITEM_STATUS_LABELS[it.status] ?? it.status}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn--secondary"
                                type="button"
                                onClick={() => removeItem(it.key)}
                                disabled={form.items.length <= 1}
                              >
                                Удалить
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="muted table-footnote">
                    Статус позиции ставит рабочий; итоги пересчитываются на бэке
                    после сохранения.
                  </p>
                </div>

                {actionError && (
                  <p className="alert alert--error" role="alert">
                    {actionError}
                  </p>
                )}

                <div className="form-row">
                  <button className="btn" type="submit" disabled={busy}>
                    {busy ? 'Сохранение…' : isNew ? 'Создать' : 'Сохранить'}
                  </button>
                </div>
              </form>
            )}

            {canEdit && !isNew && wo && (
              <div className="card">
                <div className="section-head">
                  <h2>Статус ЗН</h2>
                  <StatusBadge status={wo.status} />
                </div>
                <form className="form-panel" onSubmit={onChangeStatus}>
                  <fieldset disabled={busy || transitions.length === 0}>
                    {transitions.length === 0 ? (
                      <p className="muted">
                        Текущий статус:{' '}
                        <strong>{WO_STATUS_LABELS[wo.status] ?? wo.status}</strong>
                        . Переходов нет (конечный статус).
                      </p>
                    ) : (
                      <div className="form-row">
                        <select
                          className="select"
                          value={nextStatus || wo.status}
                          onChange={(e) =>
                            setNextStatus(e.target.value as WorkOrderStatus)
                          }
                          required
                          aria-label="Статус ЗН"
                        >
                          <option value={wo.status}>
                            {WO_STATUS_LABELS[wo.status] ?? wo.status} — текущий
                          </option>
                          {transitions.map((s) => (
                            <option key={s} value={s}>
                              {WO_STATUS_LABELS[s] ?? s}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn"
                          type="submit"
                          disabled={
                            busy || !nextStatus || nextStatus === wo.status
                          }
                        >
                          Применить
                        </button>
                      </div>
                    )}
                  </fieldset>
                </form>
              </div>
            )}

            {!canEdit && !isNew && wo && (
              <div className="card">
                <div className="section-head">
                  <h2>Статус ЗН</h2>
                </div>
                <div className="title-with-badge">
                  <StatusBadge status={wo.status} />
                </div>
              </div>
            )}
          </div>
        )}
      </StatusBlock>
    </section>
  )
}

function ReadonlyWorkOrder({
  wo,
  showMoney,
  canEditItemStatus,
  onItemStatusChanged,
}: {
  wo: WorkOrder
  showMoney: boolean
  canEditItemStatus: boolean
  onItemStatusChanged?: () => void
}) {
  const { userId, me } = useUser()
  const [busyItemId, setBusyItemId] = useState<number | null>(null)
  const [itemError, setItemError] = useState<string | null>(null)

  async function onItemStatus(
    itemId: number,
    status: WorkOrderItemStatus,
  ) {
    setBusyItemId(itemId)
    setItemError(null)
    try {
      await updateWorkOrderItem(userId, itemId, { status })
      onItemStatusChanged?.()
    } catch (err) {
      setItemError(formatApiError(err))
    } finally {
      setBusyItemId(null)
    }
  }

  return (
    <>
      <div className="card">
        <dl className="meta-grid">
          <div>
            <dt>Статус ЗН</dt>
            <dd>
              <StatusBadge status={wo.status} />{' '}
            </dd>
          </div>
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
      </div>

      <div className="card card--flush">
        <div className="card__header">
          <h2 className="card__title">Позиции</h2>
        </div>
        {itemError && (
          <p className="alert alert--error" role="alert">
            {itemError}
          </p>
        )}
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
                {wo.items.map((item) => {
                  const editable =
                    canEditItemStatus &&
                    canUpdateWorkOrderItemStatus(
                      me?.role,
                      me?.id ?? userId,
                      wo,
                      item,
                    )
                  return (
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
                        {editable ? (
                          <select
                            className="select"
                            value={item.status}
                            disabled={busyItemId === item.id}
                            aria-label={`Статус позиции ${item.id}`}
                            onChange={(e) =>
                              onItemStatus(
                                item.id,
                                e.target.value as WorkOrderItemStatus,
                              )
                            }
                          >
                            {WO_ITEM_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                {WO_ITEM_STATUS_LABELS[s]}
                              </option>
                            ))}
                            {!WO_ITEM_STATUSES.includes(
                              item.status as WorkOrderItemStatus,
                            ) && (
                              <option value={item.status}>{item.status}</option>
                            )}
                          </select>
                        ) : (
                          <span className="badge badge--info">
                            {WO_ITEM_STATUS_LABELS[
                              item.status as WorkOrderItemStatus
                            ] ?? item.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {canEditItemStatus && (
          <p className="muted table-footnote">
            Меняйте статус позиции, чтобы отметить прогресс по работе.
          </p>
        )}
      </div>
    </>
  )
}
