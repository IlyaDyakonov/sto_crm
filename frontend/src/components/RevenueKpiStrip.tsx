import type { UserRole, WorkOrder } from '../api/types'
import {
  buildFinanceKpis,
  OVERDUE_DAYS,
  REVENUE_WORK_ORDER_STATUSES,
} from '../lib/revenue'
import { formatMoney } from '../lib/roles'

type Props = {
  workOrders: WorkOrder[]
  role: UserRole | null | undefined
}

function formatKpiMoney(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 100) / 100
  return formatMoney(rounded)
}

export function RevenueKpiStrip({ workOrders, role }: Props) {
  const kpis = buildFinanceKpis(workOrders)
  const scope = role === 'branch_manager' ? 'филиала' : 'сети'

  return (
    <div className="kpi-strip" role="group" aria-label={`Показатели ${scope}`}>
      <article className="kpi-tile kpi-tile--revenue">
        <h3 className="kpi-tile__label">Выручка {scope} (факт)</h3>
        <p className="kpi-tile__value">{formatKpiMoney(kpis.revenueFact)}</p>
        <p className="kpi-tile__hint">
          работы, ЗН {REVENUE_WORK_ORDER_STATUSES.join(' / ')} · {kpis.closedCount}{' '}
          шт.
        </p>
      </article>

      <article className="kpi-tile kpi-tile--avg">
        <h3 className="kpi-tile__label">Средний чек</h3>
        <p className="kpi-tile__value">{formatKpiMoney(kpis.avgCheck)}</p>
        <p className="kpi-tile__hint">только работы по закрытым ЗН</p>
      </article>

      <article className="kpi-tile kpi-tile--pipeline">
        <h3 className="kpi-tile__label">В работе</h3>
        <p className="kpi-tile__value">{formatKpiMoney(kpis.pipelineAmount)}</p>
        <p className="kpi-tile__hint">
          ожидание после выполнения · {kpis.pipelineCount} ЗН
        </p>
      </article>

      <article className="kpi-tile kpi-tile--overdue">
        <h3 className="kpi-tile__label">Просроченные</h3>
        <p className="kpi-tile__value">{kpis.overdueCount}</p>
        <p className="kpi-tile__hint">
          в работе / ждём запчасть &gt; {OVERDUE_DAYS} дн.
        </p>
      </article>
    </div>
  )
}
