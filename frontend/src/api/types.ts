/** Типы ответов API (lite, под backend schemas). */

export type UserRole = 'director' | 'branch_manager' | 'worker'

export type User = {
  id: number
  full_name: string
  email: string
  role: UserRole
  branch_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Client = {
  id: number
  name: string
  phone: string
  email: string | null
  client_type: string
  notes: string | null
  created_at: string
  updated_at: string
}

export type Vehicle = {
  id: number
  client_id: number
  plate_number: string
  vin: string | null
  make: string
  model: string
  year: number | null
  mileage: number | null
  created_at: string
  updated_at: string
}

export type WorkOrderStatus =
  | 'created'
  | 'assigned'
  | 'waiting_parts'
  | 'in_progress'
  | 'work_completed'
  | 'ready_for_pickup'
  | 'delivered'
  | 'closed'
  | 'cancelled'

export type WorkOrderItem = {
  id: number
  work_order_id: number
  title: string
  description: string | null
  item_type: string
  qty: string | number
  unit_price?: string | number | null
  amount?: string | number | null
  assignee_id: number | null
  status: string
  sort_order: number
}

export type WorkOrder = {
  id: number
  number: string
  branch_id: number
  visit_id: number | null
  client_id: number
  vehicle_id: number
  title: string | null
  status: WorkOrderStatus
  primary_assignee_id: number | null
  assigned_by?: number | null
  assigned_at?: string | null
  total_labor_amount?: string | number | null
  total_parts_amount?: string | number | null
  total_amount?: string | number | null
  is_warranty: boolean
  urgency: string
  notes: string | null
  items: WorkOrderItem[]
  created_at: string
  updated_at: string
}

export type Task = {
  id: number
  branch_id: number | null
  client_id: number | null
  vehicle_id: number | null
  work_order_id: number | null
  assignee_id: number
  task_type: string
  title: string
  due_at: string | null
  status: string
  created_by: number
  created_at: string
  updated_at: string
}

export type Branch = {
  id: number
  name: string
  address: string | null
  is_active: boolean
  plan_monthly_revenue?: string | number | null
  created_at: string
  updated_at: string
}

export type Payment = {
  id: number
  work_order_id: number
  branch_id: number
  amount: string | number
  method: string
  paid_at: string
  created_by: number
  comment: string | null
}
