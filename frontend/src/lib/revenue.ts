import type { Branch, WorkOrder, WorkOrderStatus } from '../api/types'

/**
 * Факт выручки филиала = сумма total_amount по ЗН со статусом closed
 * (ЗН закрыт = работы выполнены и деньги получены).
 */
export const REVENUE_WORK_ORDER_STATUSES: readonly WorkOrderStatus[] = [
  'closed',
]

/** Статусы «ещё не закрыт» — ожидаемая выручка после выполнения. */
export const PIPELINE_WORK_ORDER_STATUSES: readonly WorkOrderStatus[] = [
  'created',
  'assigned',
  'waiting_parts',
  'in_progress',
  'work_completed',
  'ready_for_pickup',
  'delivered',
]

/** Просрочка: работа начата и дольше 7 дней в активном статусе. */
export const OVERDUE_WORK_ORDER_STATUSES: readonly WorkOrderStatus[] = [
  'in_progress',
  'waiting_parts',
]

export const OVERDUE_DAYS = 7

export function isRevenueStatus(status: WorkOrderStatus): boolean {
  return (REVENUE_WORK_ORDER_STATUSES as readonly string[]).includes(status)
}

export function isPipelineStatus(status: WorkOrderStatus): boolean {
  return (PIPELINE_WORK_ORDER_STATUSES as readonly string[]).includes(status)
}

export function isOverdueCandidateStatus(status: WorkOrderStatus): boolean {
  return (OVERDUE_WORK_ORDER_STATUSES as readonly string[]).includes(status)
}

export function parseAmount(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Только работы (без запчастей) — total_labor_amount. */
export function laborAmount(wo: WorkOrder): number {
  return parseAmount(wo.total_labor_amount)
}

/** Сумма выручки по филиалу из уже отфильтрованного ACL-ом списка ЗН. */
export function sumBranchRevenue(
  workOrders: WorkOrder[],
  branchId: number,
): number {
  let sum = 0
  for (const wo of workOrders) {
    if (wo.branch_id !== branchId) continue
    if (!isRevenueStatus(wo.status)) continue
    sum += parseAmount(wo.total_amount)
  }
  return sum
}

export type BranchFact = {
  branch: Branch
  fact: number
}

export function buildBranchFacts(
  branches: Branch[],
  workOrders: WorkOrder[],
): BranchFact[] {
  return branches.map((branch) => ({
    branch,
    fact: sumBranchRevenue(workOrders, branch.id),
  }))
}

function workStartedAt(wo: WorkOrder): Date | null {
  const raw = wo.assigned_at ?? wo.created_at
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export function isOverdueWorkOrder(
  wo: WorkOrder,
  now: Date = new Date(),
): boolean {
  if (!isOverdueCandidateStatus(wo.status)) return false
  const started = workStartedAt(wo)
  if (!started) return false
  const ms = OVERDUE_DAYS * 24 * 60 * 60 * 1000
  return now.getTime() - started.getTime() > ms
}

export type FinanceKpis = {
  /** Факт: Σ labor по closed */
  revenueFact: number
  closedCount: number
  /** Средний чек (только работы) по closed */
  avgCheck: number
  /** В работе: Σ labor по незакрытым */
  pipelineAmount: number
  pipelineCount: number
  /** Просроченные: число ЗН */
  overdueCount: number
}

/**
 * KPI по уже ACL-отфильтрованному списку ЗН
 * (директор — сеть, руководитель — свой филиал).
 * Деньги — только работы (total_labor_amount), без запчастей.
 */
export function buildFinanceKpis(workOrders: WorkOrder[]): FinanceKpis {
  let revenueFact = 0
  let closedCount = 0
  let pipelineAmount = 0
  let pipelineCount = 0
  let overdueCount = 0
  const now = new Date()

  for (const wo of workOrders) {
    if (isRevenueStatus(wo.status)) {
      revenueFact += laborAmount(wo)
      closedCount += 1
    }
    if (isPipelineStatus(wo.status)) {
      pipelineAmount += laborAmount(wo)
      pipelineCount += 1
    }
    if (isOverdueWorkOrder(wo, now)) {
      overdueCount += 1
    }
  }

  return {
    revenueFact,
    closedCount,
    avgCheck: closedCount > 0 ? revenueFact / closedCount : 0,
    pipelineAmount,
    pipelineCount,
    overdueCount,
  }
}
