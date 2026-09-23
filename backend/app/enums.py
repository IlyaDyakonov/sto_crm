from enum import StrEnum


class UserRole(StrEnum):
    DIRECTOR = "director"
    BRANCH_MANAGER = "branch_manager"
    WORKER = "worker"


class ClientType(StrEnum):
    PERSON = "person"
    COMPANY = "company"


class TouchChannel(StrEnum):
    CALL = "call"
    WHATSAPP = "whatsapp"
    SITE = "site"
    WALK_IN = "walk_in"
    REFERRAL = "referral"
    OTHER = "other"


class TouchDirection(StrEnum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class TouchOutcome(StrEnum):
    RECORDED = "recorded"
    CALLBACK = "callback"
    REJECTED = "rejected"
    SPAM = "spam"


class AppointmentStatus(StrEnum):
    NEW = "new"
    CONFIRMED = "confirmed"
    ARRIVED = "arrived"
    NO_SHOW = "no_show"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


class VisitStage(StrEnum):
    INTAKE = "intake"
    DIAGNOSIS = "diagnosis"
    APPROVAL = "approval"
    DONE_FOR_WO = "done_for_wo"
    LOST = "lost"


class VisitStatus(StrEnum):
    WAITING_INTAKE = "waiting_intake"
    ACCEPTED = "accepted"
    IN_DIAGNOSIS = "in_diagnosis"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    LOST = "lost"
    CANCELLED = "cancelled"


class ApprovalStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    THINKING = "thinking"


class WorkOrderStatus(StrEnum):
    CREATED = "created"
    ASSIGNED = "assigned"
    WAITING_PARTS = "waiting_parts"
    IN_PROGRESS = "in_progress"
    WORK_COMPLETED = "work_completed"
    READY_FOR_PICKUP = "ready_for_pickup"
    DELIVERED = "delivered"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class WorkOrderItemType(StrEnum):
    LABOR = "labor"
    PART = "part"


class WorkOrderItemStatus(StrEnum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    WAITING_PARTS = "waiting_parts"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class Urgency(StrEnum):
    NORMAL = "normal"
    HIGH = "high"
    TOW = "tow"


class PaymentMethod(StrEnum):
    CASH = "cash"
    CARD = "card"
    TRANSFER = "transfer"
    MIXED = "mixed"


class TaskType(StrEnum):
    CALLBACK = "callback"
    APPROVE_EXTRAS = "approve_extras"
    REMIND_SERVICE = "remind_service"
    PICKUP = "pickup"
    ESCALATION = "escalation"
    OTHER = "other"


class TaskStatus(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"
