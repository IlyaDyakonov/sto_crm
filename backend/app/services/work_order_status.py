from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.enums import WorkOrderStatus
from app.models import WorkOrder, WorkOrderStatusHistory

# Allowed transitions for work order header status.
WO_TRANSITIONS: dict[WorkOrderStatus, set[WorkOrderStatus]] = {
    WorkOrderStatus.CREATED: {
        WorkOrderStatus.ASSIGNED,
        WorkOrderStatus.WAITING_PARTS,
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.CANCELLED,
    },
    WorkOrderStatus.ASSIGNED: {
        WorkOrderStatus.WAITING_PARTS,
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.CANCELLED,
    },
    WorkOrderStatus.WAITING_PARTS: {
        WorkOrderStatus.ASSIGNED,
        WorkOrderStatus.IN_PROGRESS,
        WorkOrderStatus.CANCELLED,
    },
    WorkOrderStatus.IN_PROGRESS: {
        WorkOrderStatus.WAITING_PARTS,
        WorkOrderStatus.WORK_COMPLETED,
        WorkOrderStatus.CANCELLED,
    },
    WorkOrderStatus.WORK_COMPLETED: {
        WorkOrderStatus.READY_FOR_PICKUP,
        WorkOrderStatus.IN_PROGRESS,
    },
    WorkOrderStatus.READY_FOR_PICKUP: {
        WorkOrderStatus.DELIVERED,
        WorkOrderStatus.IN_PROGRESS,
    },
    WorkOrderStatus.DELIVERED: {WorkOrderStatus.CLOSED},
    WorkOrderStatus.CLOSED: set(),
    WorkOrderStatus.CANCELLED: set(),
}


def change_work_order_status(
    db: Session,
    wo: WorkOrder,
    new_status: WorkOrderStatus,
    changed_by: int,
    note: str | None = None,
) -> WorkOrder:
    current = wo.status
    allowed = WO_TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition work order from '{current}' to '{new_status}'",
        )

    history = WorkOrderStatusHistory(
        work_order_id=wo.id,
        from_status=current.value,
        to_status=new_status.value,
        changed_by=changed_by,
        note=note,
        changed_at=datetime.now(timezone.utc),
    )
    db.add(history)

    wo.status = new_status
    now = datetime.now(timezone.utc)
    if new_status == WorkOrderStatus.READY_FOR_PICKUP:
        wo.ready_at = now
    elif new_status == WorkOrderStatus.DELIVERED:
        wo.delivered_at = now
    elif new_status == WorkOrderStatus.CLOSED:
        wo.closed_at = now

    db.flush()
    return wo
