import { apiJson } from './client'
import type {
  Branch,
  Client,
  Payment,
  Task,
  User,
  Vehicle,
  WorkOrder,
  WorkOrderStatus,
} from './types'

export function getMe(userId: number): Promise<User> {
  return apiJson<User>('/api/me', userId)
}

export function listBranches(userId: number): Promise<Branch[]> {
  return apiJson<Branch[]>('/api/branches', userId)
}

export function listUsers(userId: number): Promise<User[]> {
  return apiJson<User[]>('/api/users', userId)
}

export function listClients(userId: number, q?: string): Promise<Client[]> {
  const params = new URLSearchParams()
  if (q?.trim()) params.set('q', q.trim())
  const qs = params.toString()
  return apiJson<Client[]>(`/api/clients${qs ? `?${qs}` : ''}`, userId)
}

export function listVehicles(
  userId: number,
  opts?: { plate?: string; client_id?: number },
): Promise<Vehicle[]> {
  const params = new URLSearchParams()
  if (opts?.plate?.trim()) params.set('plate', opts.plate.trim())
  if (opts?.client_id != null) params.set('client_id', String(opts.client_id))
  const qs = params.toString()
  return apiJson<Vehicle[]>(`/api/vehicles${qs ? `?${qs}` : ''}`, userId)
}

export function listWorkOrders(userId: number): Promise<WorkOrder[]> {
  return apiJson<WorkOrder[]>('/api/work-orders', userId)
}

export function getWorkOrder(userId: number, workOrderId: number): Promise<WorkOrder> {
  return apiJson<WorkOrder>(`/api/work-orders/${workOrderId}`, userId)
}

export function changeWorkOrderStatus(
  userId: number,
  workOrderId: number,
  status: WorkOrderStatus,
  note?: string,
): Promise<WorkOrder> {
  return apiJson<WorkOrder>(`/api/work-orders/${workOrderId}/status`, userId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, note: note || null }),
  })
}

export function assignWorkOrder(
  userId: number,
  workOrderId: number,
  primaryAssigneeId: number,
  note?: string,
): Promise<WorkOrder> {
  return apiJson<WorkOrder>(`/api/work-orders/${workOrderId}/assign`, userId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      primary_assignee_id: primaryAssigneeId,
      note: note || null,
    }),
  })
}

export function listTasks(userId: number): Promise<Task[]> {
  return apiJson<Task[]>('/api/tasks', userId)
}

export function listPayments(userId: number): Promise<Payment[]> {
  return apiJson<Payment[]>('/api/payments', userId)
}
