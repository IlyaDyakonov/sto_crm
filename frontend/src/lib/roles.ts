import type { User, UserRole, WorkOrderStatus } from '../api/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  director: 'Директор',
  branch_manager: 'Руководитель',
  worker: 'Рабочий',
}

export function roleLabel(role: UserRole | null | undefined): string {
  if (!role) return '—'
  return ROLE_LABELS[role] ?? role
}

export function roleBadgeClass(role: UserRole | null | undefined): string {
  if (role === 'director') return 'badge badge--role-director'
  if (role === 'branch_manager') return 'badge badge--role-manager'
  if (role === 'worker') return 'badge badge--role-worker'
  return 'badge badge--neutral'
}

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

export const WO_ITEM_STATUSES = [
  'pending',
  'assigned',
  'waiting_parts',
  'in_progress',
  'done',
] as const

export type WorkOrderItemStatus = (typeof WO_ITEM_STATUSES)[number]

export const WO_ITEM_STATUS_LABELS: Record<WorkOrderItemStatus, string> = {
  pending: 'Ожидает',
  assigned: 'Назначена',
  waiting_parts: 'Ждём запчасти',
  in_progress: 'В работе',
  done: 'Готово',
}

export function canUpdateWorkOrderItemStatus(
  role: UserRole | null | undefined,
  userId: number | null | undefined,
  wo: { primary_assignee_id: number | null },
  item: { assignee_id: number | null },
): boolean {
  if (role !== 'worker' || userId == null) return false
  if (item.assignee_id === userId) return true
  if (wo.primary_assignee_id === userId) return true
  return false
}
