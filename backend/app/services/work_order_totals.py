from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import WorkOrderItemType
from app.models import WorkOrder, WorkOrderItem


def recalc_work_order_totals(db: Session, work_order_id: int) -> WorkOrder:
    """Single place to recalculate WO cached totals from items."""
    wo = db.get(WorkOrder, work_order_id)
    if wo is None:
        raise ValueError(f"WorkOrder {work_order_id} not found")

    items = db.scalars(
        select(WorkOrderItem).where(WorkOrderItem.work_order_id == work_order_id)
    ).all()

    labor = Decimal("0.00")
    parts = Decimal("0.00")
    for item in items:
        item.amount = (item.qty * item.unit_price).quantize(Decimal("0.01"))
        if item.item_type == WorkOrderItemType.LABOR:
            labor += item.amount
        else:
            parts += item.amount

    wo.total_labor_amount = labor.quantize(Decimal("0.01"))
    wo.total_parts_amount = parts.quantize(Decimal("0.01"))
    wo.total_amount = (labor + parts).quantize(Decimal("0.01"))
    db.flush()
    return wo
