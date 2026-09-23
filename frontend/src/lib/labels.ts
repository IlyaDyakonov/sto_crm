import type {
  BranchBrief,
  ClientBrief,
  UserBrief,
  VehicleBrief,
  WorkOrder,
  WorkOrderItem,
} from '../api/types'

function fallbackId(id: number | null | undefined): string {
  if (id == null) return '—'
  return `#${id}`
}

export function branchLabel(
  brief: BranchBrief | null | undefined,
  id: number | null | undefined,
): string {
  return brief?.name?.trim() || fallbackId(id)
}

export function clientLabel(
  brief: ClientBrief | null | undefined,
  id: number | null | undefined,
): string {
  return brief?.name?.trim() || fallbackId(id)
}

export function vehicleLabel(
  brief: VehicleBrief | null | undefined,
  id: number | null | undefined,
): string {
  if (brief) {
    const plate = brief.plate_number?.trim() ?? ''
    const car = [brief.make, brief.model].filter(Boolean).join(' ').trim()
    const text = [plate, car].filter(Boolean).join(' · ')
    if (text) return text
  }
  return fallbackId(id)
}

export function userBriefLabel(
  brief: UserBrief | null | undefined,
  id: number | null | undefined,
): string {
  return brief?.full_name?.trim() || fallbackId(id)
}

export function woBranchLabel(wo: WorkOrder): string {
  return branchLabel(wo.branch, wo.branch_id)
}

export function woClientLabel(wo: WorkOrder): string {
  return clientLabel(wo.client, wo.client_id)
}

export function woVehicleLabel(wo: WorkOrder): string {
  return vehicleLabel(wo.vehicle, wo.vehicle_id)
}

export function woAssigneeLabel(wo: WorkOrder): string {
  return userBriefLabel(wo.primary_assignee, wo.primary_assignee_id)
}

export function itemAssigneeLabel(item: WorkOrderItem): string {
  return userBriefLabel(item.assignee, item.assignee_id)
}
