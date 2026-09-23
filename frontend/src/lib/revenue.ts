import type { Branch, WorkOrder, WorkOrderStatus } from '../api/types'

/**
 * Факт выручки филиала = сумма total_amount по ЗН со статусом closed
 * (ЗН закрыт = работы выполнены и деньги получены).
 */
export const REVENUE_WORK_ORDER_STATUSES: readonly WorkOrderStatus[] = [
  'closed',
]

export function isRevenueStatus(status: WorkOrderStatus): boolean {
  return (REVENUE_WORK_ORDER_STATUSES as readonly string[]).includes(status)
}

export function parseAmount(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
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
