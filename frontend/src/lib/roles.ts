import type { User, UserRole, WorkOrderStatus } from '../api/types'

export function isWorker(role: UserRole | null | undefined): boolean {
  return role === 'worker'
}

export function canSeeFinance(role: UserRole | null | undefined): boolean {
  return role === 'director' || role === 'branch_manager'
}

/** Смена статуса шапки ЗН и назначение — director / branch_manager (см. ACL бэка). */
export function canManageWorkOrderHeader(role: UserRole | null | undefined): boolean {
  return role === 'director' || role === 'branch_manager'
}

export function canAssignWorkOrder(role: UserRole | null | undefined): boolean {
  return canManageWorkOrderHeader(role)
}

export function formatMoney(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  return String(value)
}

export function userLabel(user: User | null | undefined): string {
  if (!user) return '—'
  return `${user.full_name} (#${user.id})`
}

/** Допустимые переходы статуса ЗН (зеркало backend WO_TRANSITIONS). */
export const WO_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  created: ['assigned', 'waiting_parts', 'in_progress', 'cancelled'],
  assigned: ['waiting_parts', 'in_progress', 'cancelled'],
  waiting_parts: ['assigned', 'in_progress', 'cancelled'],
  in_progress: ['waiting_parts', 'work_completed', 'cancelled'],
  work_completed: ['ready_for_pickup', 'in_progress'],
  ready_for_pickup: ['delivered', 'in_progress'],
  delivered: ['closed'],
  closed: [],
  cancelled: [],
}

export const WO_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  created: 'Создан',
  assigned: 'Назначен',
  waiting_parts: 'Ждём запчасти',
  in_progress: 'В работе',
  work_completed: 'Работы завершены',
  ready_for_pickup: 'К выдаче',
  delivered: 'Выдан',
  closed: 'Закрыт',
  cancelled: 'Отменён',
}

export function nextWorkOrderStatuses(current: WorkOrderStatus): WorkOrderStatus[] {
  return WO_TRANSITIONS[current] ?? []
}
