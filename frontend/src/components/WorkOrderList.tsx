import { Link } from 'react-router-dom'
import type { UserRole, WorkOrder } from '../api/types'
import {
  woAssigneeLabel,
  woBranchLabel,
  woClientLabel,
  woVehicleLabel,
} from '../lib/labels'
import { canSeeFinance, formatMoney } from '../lib/roles'
import { StatusBadge } from './StatusBadge'

type Props = {
  items: WorkOrder[]
  role: UserRole | null | undefined
  emptyText?: string
}

export function WorkOrderList({ items, role, emptyText = 'Нет заказ-нарядов' }: Props) {
  const showMoney = canSeeFinance(role)

  if (!items.length) {
    return <p className="empty-hint">{emptyText}</p>
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Номер</th>
            <th>Статус</th>
            <th>Филиал</th>
            <th>Клиент</th>
            <th>Авто</th>
            <th>Исполнитель</th>
            {showMoney && <th className="num">Сумма</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((wo) => (
            <tr key={wo.id}>
              <td>
                <strong>{wo.number}</strong>
              </td>
              <td>
                <StatusBadge status={wo.status} />
              </td>
              <td>{woBranchLabel(wo)}</td>
              <td>{woClientLabel(wo)}</td>
              <td className="mono">{woVehicleLabel(wo)}</td>
              <td>{woAssigneeLabel(wo)}</td>
              {showMoney && <td className="num">{formatMoney(wo.total_amount)}</td>}
              <td>
                <Link className="row-link" to={`/work-orders/${wo.id}`}>
                  Открыть
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
