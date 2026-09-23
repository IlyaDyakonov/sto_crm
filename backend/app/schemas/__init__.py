from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.enums import (
    AppointmentStatus,
    ApprovalStatus,
    ClientType,
    PaymentMethod,
    TaskStatus,
    TaskType,
    TouchChannel,
    TouchDirection,
    TouchOutcome,
    Urgency,
    UserRole,
    VisitStage,
    VisitStatus,
    WorkOrderItemStatus,
    WorkOrderItemType,
    WorkOrderStatus,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ----- Branch -----
class BranchCreate(BaseModel):
    name: str
    address: str | None = None
    is_active: bool = True
    plan_monthly_revenue: Decimal | None = None


class BranchRead(ORMModel):
    id: int
    name: str
    address: str | None
    is_active: bool
    plan_monthly_revenue: Decimal | None
    created_at: datetime
    updated_at: datetime


# ----- User -----
class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole
    branch_id: int | None = None
    is_active: bool = True


class UserRead(ORMModel):
    id: int
    full_name: str
    email: str
    role: UserRole
    branch_id: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ----- Client -----
class ClientCreate(BaseModel):
    name: str
    phone: str
    email: str | None = None
    client_type: ClientType = ClientType.PERSON
    notes: str | None = None


class ClientRead(ORMModel):
    id: int
    name: str
    phone: str
    email: str | None
    client_type: ClientType
    notes: str | None
    created_at: datetime
    updated_at: datetime


# ----- Vehicle -----
class VehicleCreate(BaseModel):
    client_id: int
    plate_number: str
    vin: str | None = None
    make: str
    model: str
    year: int | None = None
    mileage: int | None = None


class VehicleRead(ORMModel):
    id: int
    client_id: int
    plate_number: str
    vin: str | None
    make: str
    model: str
    year: int | None
    mileage: int | None
    created_at: datetime
    updated_at: datetime


# ----- Touch -----
class TouchCreate(BaseModel):
    client_id: int | None = None
    vehicle_id: int | None = None
    branch_id: int | None = None
    channel: TouchChannel
    direction: TouchDirection
    subject: str | None = None
    outcome: TouchOutcome | None = None
    occurred_at: datetime


class TouchRead(ORMModel):
    id: int
    client_id: int | None
    vehicle_id: int | None
    branch_id: int | None
    channel: TouchChannel
    direction: TouchDirection
    subject: str | None
    outcome: TouchOutcome | None
    created_by: int
    occurred_at: datetime
    created_at: datetime
    updated_at: datetime


# ----- Appointment -----
class AppointmentCreate(BaseModel):
    branch_id: int
    client_id: int
    vehicle_id: int | None = None
    touch_id: int | None = None
    scheduled_at: datetime
    service_request: str
    status: AppointmentStatus = AppointmentStatus.NEW
    rescheduled_from_id: int | None = None


class AppointmentRead(ORMModel):
    id: int
    branch_id: int
    client_id: int
    vehicle_id: int | None
    touch_id: int | None
    scheduled_at: datetime
    service_request: str
    status: AppointmentStatus
    rescheduled_from_id: int | None
    created_by: int
    created_at: datetime
    updated_at: datetime


# ----- Visit -----
class VisitCreate(BaseModel):
    branch_id: int
    appointment_id: int | None = None
    client_id: int
    vehicle_id: int
    stage: VisitStage = VisitStage.INTAKE
    status: VisitStatus = VisitStatus.WAITING_INTAKE
    complaint: str | None = None
    diagnosis_summary: str | None = None
    estimate_amount: Decimal | None = None
    approval_status: ApprovalStatus = ApprovalStatus.PENDING
    lost_reason: str | None = None


class VisitUpdate(BaseModel):
    stage: VisitStage | None = None
    status: VisitStatus | None = None
    complaint: str | None = None
    diagnosis_summary: str | None = None
    estimate_amount: Decimal | None = None
    approval_status: ApprovalStatus | None = None
    lost_reason: str | None = None


class VisitRead(ORMModel):
    id: int
    branch_id: int
    appointment_id: int | None
    client_id: int
    vehicle_id: int
    stage: VisitStage
    status: VisitStatus
    complaint: str | None
    diagnosis_summary: str | None
    estimate_amount: Decimal | None
    approval_status: ApprovalStatus
    lost_reason: str | None
    accepted_at: datetime | None
    approved_at: datetime | None
    created_at: datetime
    updated_at: datetime


# ----- Brief nested (WO responses) -----
class BranchBrief(ORMModel):
    id: int
    name: str


class ClientBrief(ORMModel):
    id: int
    name: str


class VehicleBrief(ORMModel):
    id: int
    plate_number: str
    make: str
    model: str


class UserBrief(ORMModel):
    id: int
    full_name: str


# ----- Work order item -----
class WorkOrderItemCreate(BaseModel):
    title: str
    description: str | None = None
    item_type: WorkOrderItemType
    qty: Decimal = Field(default=Decimal("1"))
    unit_price: Decimal
    assignee_id: int | None = None
    status: WorkOrderItemStatus = WorkOrderItemStatus.PENDING
    sort_order: int = 0


class WorkOrderItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    item_type: WorkOrderItemType | None = None
    qty: Decimal | None = None
    unit_price: Decimal | None = None
    assignee_id: int | None = None
    status: WorkOrderItemStatus | None = None
    sort_order: int | None = None


class WorkOrderItemRead(ORMModel):
    id: int
    work_order_id: int
    title: str
    description: str | None
    item_type: WorkOrderItemType
    qty: Decimal
    unit_price: Decimal | None = None
    amount: Decimal | None = None
    assignee_id: int | None
    assignee: UserBrief | None = None
    status: WorkOrderItemStatus
    sort_order: int
    created_at: datetime
    updated_at: datetime


# ----- Work order -----
class WorkOrderCreate(BaseModel):
    number: str
    branch_id: int
    visit_id: int | None = None
    client_id: int
    vehicle_id: int
    title: str | None = None
    primary_assignee_id: int | None = None
    is_warranty: bool = False
    parent_work_order_id: int | None = None
    urgency: Urgency = Urgency.NORMAL
    notes: str | None = None
    items: list[WorkOrderItemCreate] = Field(default_factory=list)


class WorkOrderAssign(BaseModel):
    primary_assignee_id: int
    note: str | None = None


class WorkOrderStatusChange(BaseModel):
    status: WorkOrderStatus
    note: str | None = None


class WorkOrderStatusHistoryRead(ORMModel):
    id: int
    work_order_id: int
    from_status: str | None
    to_status: str
    changed_by: int
    note: str | None
    changed_at: datetime


class WorkOrderRead(ORMModel):
    id: int
    number: str
    branch_id: int
    visit_id: int | None
    client_id: int
    vehicle_id: int
    title: str | None
    status: WorkOrderStatus
    primary_assignee_id: int | None
    assigned_by: int | None
    assigned_at: datetime | None
    total_labor_amount: Decimal | None = None
    total_parts_amount: Decimal | None = None
    total_amount: Decimal | None = None
    is_warranty: bool
    parent_work_order_id: int | None
    urgency: Urgency
    notes: str | None
    ready_at: datetime | None
    delivered_at: datetime | None
    closed_at: datetime | None
    branch: BranchBrief
    client: ClientBrief
    vehicle: VehicleBrief
    primary_assignee: UserBrief | None = None
    items: list[WorkOrderItemRead] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# ----- Payment -----
class PaymentCreate(BaseModel):
    work_order_id: int
    amount: Decimal
    method: PaymentMethod
    paid_at: datetime
    comment: str | None = None


class PaymentRead(ORMModel):
    id: int
    work_order_id: int
    branch_id: int
    amount: Decimal
    method: PaymentMethod
    paid_at: datetime
    created_by: int
    comment: str | None
    created_at: datetime
    updated_at: datetime


# ----- Task -----
class TaskCreate(BaseModel):
    branch_id: int | None = None
    client_id: int | None = None
    vehicle_id: int | None = None
    work_order_id: int | None = None
    assignee_id: int
    task_type: TaskType
    title: str
    due_at: datetime | None = None
    status: TaskStatus = TaskStatus.OPEN


class TaskUpdate(BaseModel):
    status: TaskStatus | None = None
    title: str | None = None
    due_at: datetime | None = None
    assignee_id: int | None = None


class TaskRead(ORMModel):
    id: int
    branch_id: int | None
    client_id: int | None
    vehicle_id: int | None
    work_order_id: int | None
    assignee_id: int
    task_type: TaskType
    title: str
    due_at: datetime | None
    status: TaskStatus
    created_by: int
    created_at: datetime
    updated_at: datetime
