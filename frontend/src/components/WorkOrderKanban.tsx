import { Link } from 'react-router-dom'
import type { UserRole, WorkOrder, WorkOrderStatus } from '../api/types'
import {
  woAssigneeLabel,
  woBranchLabel,
  woClientLabel,
  woVehicleLabel,
} from '../lib/labels'
import {
  WO_STATUS_LABELS,
  WO_STATUS_ORDER,
  canSeeFinance,
  formatMoney,
} from '../lib/roles'
import { StatusBadge } from './StatusBadge'

type Props = {
  items: WorkOrder[]
  role: UserRole | null | undefined
}

function sortInColumn(a: WorkOrder, b: WorkOrder): number {
  const ta = a.updated_at || a.created_at || ''
  const tb = b.updated_at || b.created_at || ''
  if (ta !== tb) return tb.localeCompare(ta)
  return b.id - a.id
}

function groupByStatus(items: WorkOrder[]): Record<WorkOrderStatus, WorkOrder[]> {
  const groups = Object.fromEntries(
    WO_STATUS_ORDER.map((s) => [s, [] as WorkOrder[]]),
  ) as Record<WorkOrderStatus, WorkOrder[]>

  for (const wo of items) {
    const key: WorkOrderStatus = WO_STATUS_ORDER.includes(wo.status)
      ? wo.status
      : 'created'
    groups[key].push(wo)
  }

  for (const status of WO_STATUS_ORDER) {
    groups[status].sort(sortInColumn)
  }

  return groups
}

export function WorkOrderKanban({ items, role }: Props) {
  const showMoney = canSeeFinance(role)
  const groups = groupByStatus(items)

  return (
    <div className="kanban" role="list" aria-label="Канбан заказ-нарядов по статусам">
      {WO_STATUS_ORDER.map((status) => {
        const columnItems = groups[status]
        const count = columnItems.length
        return (
          <section
            key={status}
            className="kanban__column"
            role="listitem"
            aria-label={`${WO_STATUS_LABELS[status]}: ${count}`}
          >
            <header className="kanban__column-head">
              <div className="kanban__column-title">
                <StatusBadge status={status} />
              </div>
              <span className="kanban__count" title={`Всего на этапе: ${count}`}>
                {count}
              </span>
            </header>
            <div className="kanban__cards">
              {count === 0 ? (
                <p className="kanban__empty">Нет ЗН</p>
              ) : (
                columnItems.map((wo) => (
                  <Link
                    key={wo.id}
                    className="kanban-card"
                    to={`/work-orders/${wo.id}`}
                  >
                    <div className="kanban-card__top">
                      <strong className="kanban-card__number">{wo.number}</strong>
                      {wo.is_warranty && (
                        <span className="badge badge--warning">Гарантия</span>
                      )}
                    </div>
                    {wo.title && (
                      <p className="kanban-card__title">{wo.title}</p>
                    )}
                    <dl className="kanban-card__meta">
                      <div>
                        <dt>Клиент</dt>
                        <dd>{woClientLabel(wo)}</dd>
                      </div>
                      <div>
                        <dt>Авто</dt>
                        <dd className="mono">{woVehicleLabel(wo)}</dd>
                      </div>
                      <div>
                        <dt>Филиал</dt>
                        <dd>{woBranchLabel(wo)}</dd>
                      </div>
                      <div>
                        <dt>Исполнитель</dt>
                        <dd>{woAssigneeLabel(wo)}</dd>
                      </div>
                      {showMoney && (
                        <div>
                          <dt>Сумма</dt>
                          <dd className="num">{formatMoney(wo.total_amount)}</dd>
                        </div>
                      )}
                    </dl>
                  </Link>
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
