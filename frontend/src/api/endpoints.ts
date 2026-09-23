import { apiJson } from './client'
import type {
  Branch,
  Client,
  Payment,
  Task,
  TaskStatus,
  User,
  UserRole,
  Vehicle,
  WorkOrder,
  WorkOrderCreatePayload,
  WorkOrderItem,
  WorkOrderStatus,
  WorkOrderUpdatePayload,
} from './types'

export function getMe(userId: number): Promise<User> {
  return apiJson<User>('/api/me', userId)
}

/** Все активные пользователи для переключателя ролей в шапке. */
export function listDemoUsers(userId: number): Promise<User[]> {
  return apiJson<User[]>('/api/demo/users', userId)
}

export function listBranches(userId: number): Promise<Branch[]> {
  return apiJson<Branch[]>('/api/branches', userId)
}

export function createBranch(
  userId: number,
  payload: {
    name: string
    address?: string | null
    is_active?: boolean
    plan_monthly_revenue?: number | string | null
  },
): Promise<Branch> {
  return apiJson<Branch>('/api/branches', userId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listUsers(
  userId: number,
  opts?: { role?: UserRole },
): Promise<User[]> {
  const params = new URLSearchParams()
  if (opts?.role) params.set('role', opts.role)
  const qs = params.toString()
  return apiJson<User[]>(`/api/users${qs ? `?${qs}` : ''}`, userId)
}

export function createUser(
  userId: number,
  payload: {
    full_name: string
    email: string
    role: UserRole
    branch_id?: number | null
    is_active?: boolean
  },
): Promise<User> {
  return apiJson<User>('/api/users', userId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listClients(userId: number, q?: string): Promise<Client[]> {
  const params = new URLSearchParams()
  if (q?.trim()) params.set('q', q.trim())
  const qs = params.toString()
  return apiJson<Client[]>(`/api/clients${qs ? `?${qs}` : ''}`, userId)
}

export function createClient(
  userId: number,
  payload: {
    name: string
    phone: string
    email?: string | null
    client_type?: string
    notes?: string | null
  },
): Promise<Client> {
  return apiJson<Client>('/api/clients', userId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function getClient(userId: number, clientId: number): Promise<Client> {
  return apiJson<Client>(`/api/clients/${clientId}`, userId)
}

export function listVehicles(
  userId: number,
  opts?: { plate?: string; client_id?: number; q?: string },
): Promise<Vehicle[]> {
  const params = new URLSearchParams()
  if (opts?.q?.trim()) params.set('q', opts.q.trim())
  else if (opts?.plate?.trim()) params.set('plate', opts.plate.trim())
  if (opts?.client_id != null) params.set('client_id', String(opts.client_id))
  const qs = params.toString()
  return apiJson<Vehicle[]>(`/api/vehicles${qs ? `?${qs}` : ''}`, userId)
}

export function createVehicle(
  userId: number,
  payload: {
    client_id: number
    plate_number: string
    make: string
    model: string
    vin?: string | null
    year?: number | null
    mileage?: number | null
  },
): Promise<Vehicle> {
  return apiJson<Vehicle>('/api/vehicles', userId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function getVehicle(userId: number, vehicleId: number): Promise<Vehicle> {
  return apiJson<Vehicle>(`/api/vehicles/${vehicleId}`, userId)
}

export function listWorkOrders(userId: number): Promise<WorkOrder[]> {
  return apiJson<WorkOrder[]>('/api/work-orders', userId)
}

export function getWorkOrder(userId: number, workOrderId: number): Promise<WorkOrder> {
  return apiJson<WorkOrder>(`/api/work-orders/${workOrderId}`, userId)
}

export function createWorkOrder(
  userId: number,
  payload: WorkOrderCreatePayload,
): Promise<WorkOrder> {
  return apiJson<WorkOrder>('/api/work-orders', userId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateWorkOrder(
  userId: number,
  workOrderId: number,
  payload: WorkOrderUpdatePayload,
): Promise<WorkOrder> {
  return apiJson<WorkOrder>(`/api/work-orders/${workOrderId}`, userId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
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

export function updateWorkOrderItem(
  userId: number,
  itemId: number,
  payload: { status: string },
): Promise<WorkOrderItem> {
  return apiJson<WorkOrderItem>(`/api/work-order-items/${itemId}`, userId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listTasks(userId: number): Promise<Task[]> {
  return apiJson<Task[]>('/api/tasks', userId)
}

export function createTask(
  userId: number,
  payload: {
    title: string
    task_type: string
    assignee_id: number
    branch_id?: number | null
    work_order_id?: number | null
    client_id?: number | null
    vehicle_id?: number | null
    due_at?: string | null
  },
): Promise<Task> {
  return apiJson<Task>('/api/tasks', userId, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateTask(
  userId: number,
  taskId: number,
  payload: { status?: TaskStatus; title?: string },
): Promise<Task> {
  return apiJson<Task>(`/api/tasks/${taskId}`, userId, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listPayments(userId: number): Promise<Payment[]> {
  return apiJson<Payment[]>('/api/payments', userId)
}
