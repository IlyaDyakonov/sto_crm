import type { WorkOrderStatus } from '../api/types'
import { WO_STATUS_LABELS } from '../lib/roles'

const STATUS_TONE: Record<WorkOrderStatus, string> = {
  created: 'badge--neutral',
  assigned: 'badge--info',
  waiting_parts: 'badge--warning',
  in_progress: 'badge--accent',
  work_completed: 'badge--success',
  ready_for_pickup: 'badge--info',
  delivered: 'badge--success',
  closed: 'badge--neutral',
  cancelled: 'badge--danger',
}

type Props = {
  status: string
  labels?: Record<string, string>
}

export function StatusBadge({ status, labels }: Props) {
  const text = labels?.[status] ?? WO_STATUS_LABELS[status as WorkOrderStatus] ?? status
  const tone =
    STATUS_TONE[status as WorkOrderStatus] ?? 'badge--neutral'

  return <span className={`badge ${tone}`}>{text}</span>
}
