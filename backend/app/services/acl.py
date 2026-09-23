from fastapi import HTTPException, status

from app.enums import UserRole
from app.models import User, WorkOrder, WorkOrderItem


def assert_branch_access(user: User, branch_id: int | None) -> None:
    if user.role == UserRole.DIRECTOR:
        return
    if branch_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Branch is required for this action",
        )
    if user.branch_id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied for this branch",
        )


def assert_can_manage_finance(user: User) -> None:
    if user.role == UserRole.WORKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workers cannot access finance data",
        )


def assert_can_manage_work_order(user: User, wo: WorkOrder) -> None:
    if user.role == UserRole.DIRECTOR:
        return
    if user.role == UserRole.BRANCH_MANAGER:
        assert_branch_access(user, wo.branch_id)
        return
    # worker: only assignee
    if not _worker_assigned_to_wo(user, wo):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Workers can only access their assigned work orders",
        )


def assert_can_mutate_work_order_header(user: User, wo: WorkOrder) -> None:
    """Assign / status change on WO header — director or branch manager of branch."""
    if user.role == UserRole.DIRECTOR:
        return
    if user.role == UserRole.BRANCH_MANAGER:
        assert_branch_access(user, wo.branch_id)
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only director or branch manager can change work order header",
    )


def worker_can_update_item(
    user: User, item: WorkOrderItem, wo: WorkOrder | None = None
) -> bool:
    """Рабочий может менять статус своих позиций или всех позиций ЗН, где он primary."""
    if user.role != UserRole.WORKER:
        return False
    if item.assignee_id == user.id:
        return True
    if wo is not None and wo.primary_assignee_id == user.id:
        return True
    return False


def _worker_assigned_to_wo(user: User, wo: WorkOrder) -> bool:
    if wo.primary_assignee_id == user.id:
        return True
    return any(item.assignee_id == user.id for item in wo.items)


def strip_finance_fields(data: dict, user: User) -> dict:
    if user.role != UserRole.WORKER:
        return data
    for key in (
        "total_labor_amount",
        "total_parts_amount",
        "total_amount",
        "unit_price",
        "amount",
        "estimate_amount",
        "plan_monthly_revenue",
    ):
        data.pop(key, None)
    if "items" in data and isinstance(data["items"], list):
        data["items"] = [strip_finance_fields(dict(i), user) for i in data["items"]]
    return data
