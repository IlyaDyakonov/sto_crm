import { Link } from 'react-router-dom'
import type { WorkOrder } from '../api/types'
import { canSeeFinance, formatMoney, WO_STATUS_LABELS } from '../lib/roles'
import type { UserRole } from '../api/types'

type Props = {
  items: WorkOrder[]
  role: UserRole | null | undefined
  emptyText?: string
}

export function WorkOrderList({ items, role, emptyText = 'Нет заказ-нарядов' }: Props) {
  const showMoney = canSeeFinance(role)

  if (!items.length) {
    return <p>{emptyText}</p>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Номер</th>
          <th>Статус</th>
          <th>Филиал</th>
          <th>Клиент</th>
          <th>Исполнитель</th>
          {showMoney && <th>Сумма</th>}
          <th></th>
        </tr>
      </thead>
      <tbody>
        {items.map((wo) => (
          <tr key={wo.id}>
            <td>{wo.number}</td>
            <td>{WO_STATUS_LABELS[wo.status] ?? wo.status}</td>
            <td>{wo.branch_id}</td>
            <td>{wo.client_id}</td>
            <td>{wo.primary_assignee_id ?? '—'}</td>
            {showMoney && <td>{formatMoney(wo.total_amount)}</td>}
            <td>
              <Link to={`/work-orders/${wo.id}`}>Открыть</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
