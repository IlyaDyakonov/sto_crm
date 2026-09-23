from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.deps import get_current_user
from app.enums import UserRole, VisitStatus, ApprovalStatus, WorkOrderItemStatus, WorkOrderStatus
from app.models import (
    Appointment,
    Branch,
    Client,
    Payment,
    Task,
    Touch,
    User,
    Vehicle,
    Visit,
    WorkOrder,
    WorkOrderItem,
)
from app.schemas import (
    AppointmentCreate,
    AppointmentRead,
    BranchCreate,
    BranchRead,
    ClientCreate,
    ClientRead,
    PaymentCreate,
    PaymentRead,
    TaskCreate,
    TaskRead,
    TaskUpdate,
    TouchCreate,
    TouchRead,
    UserCreate,
    UserRead,
    VehicleCreate,
    VehicleRead,
    VisitCreate,
    VisitRead,
    VisitUpdate,
    WorkOrderAssign,
    WorkOrderCreate,
    WorkOrderItemCreate,
    WorkOrderItemRead,
    WorkOrderItemUpdate,
    WorkOrderItemWrite,
    WorkOrderRead,
    WorkOrderStatusChange,
    WorkOrderStatusHistoryRead,
    WorkOrderUpdate,
)
from app.services.acl import (
    assert_branch_access,
    assert_can_manage_finance,
    assert_can_manage_work_order,
    assert_can_mutate_work_order_header,
    strip_finance_fields,
    worker_can_update_item,
)
from app.services.work_order_status import change_work_order_status
from app.services.work_order_totals import recalc_work_order_totals

router = APIRouter()


# ---------- helpers ----------

def _wo_eager_options():
    """selectinload for WO brief nests + items.assignee."""
    return (
        selectinload(WorkOrder.branch),
        selectinload(WorkOrder.client),
        selectinload(WorkOrder.vehicle),
        selectinload(WorkOrder.primary_assignee),
        selectinload(WorkOrder.items).selectinload(WorkOrderItem.assignee),
    )


def _wo_to_read(wo: WorkOrder, user: User) -> dict:
    data = WorkOrderRead.model_validate(wo).model_dump()
    return strip_finance_fields(data, user)


def _item_to_read(item: WorkOrderItem, user: User) -> dict:
    data = WorkOrderItemRead.model_validate(item).model_dump()
    return strip_finance_fields(data, user)


def _load_work_order(db: Session, work_order_id: int) -> WorkOrder | None:
    return db.scalars(
        select(WorkOrder)
        .where(WorkOrder.id == work_order_id)
        .options(*_wo_eager_options())
    ).first()


def _load_work_order_item(db: Session, item_id: int) -> WorkOrderItem | None:
    return db.scalars(
        select(WorkOrderItem)
        .where(WorkOrderItem.id == item_id)
        .options(selectinload(WorkOrderItem.assignee))
    ).first()


def _visit_to_read(visit: Visit, user: User) -> dict:
    data = VisitRead.model_validate(visit).model_dump()
    return strip_finance_fields(data, user)


def _branch_to_read(branch: Branch, user: User) -> dict:
    data = BranchRead.model_validate(branch).model_dump()
    return strip_finance_fields(data, user)


def _validate_wo_client_vehicle(
    db: Session, client_id: int, vehicle_id: int
) -> None:
    client = db.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Client not found")
    vehicle = db.get(Vehicle, vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=400, detail="Vehicle not found")
    if vehicle.client_id != client_id:
        raise HTTPException(
            status_code=400, detail="Vehicle does not belong to client"
        )


def _validate_wo_assignee(
    db: Session, assignee_id: int | None, branch_id: int
) -> None:
    if assignee_id is None:
        return
    assignee = db.get(User, assignee_id)
    if not assignee or assignee.role != UserRole.WORKER:
        raise HTTPException(status_code=400, detail="Assignee must be a worker")
    if assignee.branch_id != branch_id:
        raise HTTPException(
            status_code=400, detail="Worker must belong to WO branch"
        )


def _assign_wo_number(db: Session, wo: WorkOrder) -> None:
    year = datetime.now(timezone.utc).year
    wo.number = f"WO-{year}-{wo.id:04d}"
    db.flush()


def _replace_wo_items(
    db: Session, wo: WorkOrder, items: list[WorkOrderItemWrite]
) -> None:
    """Полная замена позиций: переданные с id обновляются, без id — создаются,
    отсутствующие в payload удаляются."""
    existing = {item.id: item for item in list(wo.items)}
    keep_ids: set[int] = set()
    for idx, raw in enumerate(items):
        data = raw.model_dump(exclude={"id"})
        data["sort_order"] = data.get("sort_order") or idx
        if raw.id is not None and raw.id in existing:
            item = existing[raw.id]
            for key, value in data.items():
                setattr(item, key, value)
            keep_ids.add(raw.id)
        else:
            item = WorkOrderItem(work_order_id=wo.id, **data)
            db.add(item)
    for item_id, item in existing.items():
        if item_id not in keep_ids:
            db.delete(item)
    db.flush()


# ---------- health / me ----------

@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> User:
    return user


# ---------- branches ----------

@router.get("/branches")
def list_branches(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    # Worker: без филиалов/плана (финансы скрыты на UI и в strip_finance_fields)
    if user.role == UserRole.WORKER:
        return []
    q = select(Branch).order_by(Branch.id)
    if user.role == UserRole.BRANCH_MANAGER:
        q = q.where(Branch.id == user.branch_id)
    rows = db.scalars(q).all()
    return [_branch_to_read(b, user) for b in rows]


@router.post("/branches", status_code=status.HTTP_201_CREATED)
def create_branch(
    payload: BranchCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    if user.role != UserRole.DIRECTOR:
        raise HTTPException(status_code=403, detail="Only director can create branches")
    branch = Branch(**payload.model_dump())
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return _branch_to_read(branch, user)


@router.get("/branches/{branch_id}")
def get_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    assert_branch_access(user, branch_id)
    branch = db.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    return _branch_to_read(branch, user)


# ---------- users ----------

@router.get("/users", response_model=list[UserRead])
def list_users(
    role: UserRole | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[User]:
    q = select(User).order_by(User.id)
    if user.role == UserRole.BRANCH_MANAGER:
        # Только свой филиал (для назначения исполнителя — role=worker)
        q = q.where(User.branch_id == user.branch_id)
    elif user.role == UserRole.WORKER:
        q = q.where(User.id == user.id)
    if role is not None:
        q = q.where(User.role == role)
    return list(db.scalars(q).all())


@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> User:
    if user.role == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot create users")
    if user.role == UserRole.BRANCH_MANAGER:
        if payload.branch_id != user.branch_id:
            raise HTTPException(status_code=403, detail="Can only create users in own branch")
        if payload.role == UserRole.DIRECTOR:
            raise HTTPException(status_code=403, detail="Cannot create director")
    if payload.role == UserRole.DIRECTOR:
        if payload.branch_id is not None:
            raise HTTPException(
                status_code=400, detail="Director must not be bound to a branch"
            )
    elif payload.branch_id is None:
        raise HTTPException(
            status_code=400, detail="branch_id is required for this role"
        )
    elif not db.get(Branch, payload.branch_id):
        raise HTTPException(status_code=400, detail="Branch not found")
    row = User(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ---------- clients ----------

@router.get("/clients", response_model=list[ClientRead])
def list_clients(
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Client]:
    stmt = select(Client).order_by(Client.id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Client.name.ilike(like), Client.phone.ilike(like)))
    return list(db.scalars(stmt).all())


@router.post("/clients", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Client:
    if user.role == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot create clients")
    row = Client(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/clients/{client_id}", response_model=ClientRead)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Client:
    row = db.get(Client, client_id)
    if not row:
        raise HTTPException(status_code=404, detail="Client not found")
    return row


# ---------- vehicles ----------

@router.get("/vehicles", response_model=list[VehicleRead])
def list_vehicles(
    plate: str | None = None,
    client_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Vehicle]:
    stmt = select(Vehicle).order_by(Vehicle.id)
    if plate:
        stmt = stmt.where(Vehicle.plate_number.ilike(f"%{plate}%"))
    if client_id:
        stmt = stmt.where(Vehicle.client_id == client_id)
    return list(db.scalars(stmt).all())


@router.post("/vehicles", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    payload: VehicleCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Vehicle:
    if user.role == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot create vehicles")
    if not db.get(Client, payload.client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    row = Vehicle(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.get("/vehicles/{vehicle_id}", response_model=VehicleRead)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Vehicle:
    row = db.get(Vehicle, vehicle_id)
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return row


# ---------- touches ----------

@router.get("/touches", response_model=list[TouchRead])
def list_touches(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Touch]:
    stmt = select(Touch).order_by(Touch.id.desc())
    if user.role != UserRole.DIRECTOR:
        stmt = stmt.where(
            or_(Touch.branch_id == user.branch_id, Touch.branch_id.is_(None))
        )
    return list(db.scalars(stmt.limit(100)).all())


@router.post("/touches", response_model=TouchRead, status_code=status.HTTP_201_CREATED)
def create_touch(
    payload: TouchCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Touch:
    if payload.branch_id is not None:
        assert_branch_access(user, payload.branch_id)
    row = Touch(**payload.model_dump(), created_by=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ---------- appointments ----------

@router.get("/appointments", response_model=list[AppointmentRead])
def list_appointments(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Appointment]:
    stmt = select(Appointment).order_by(Appointment.scheduled_at.desc())
    if user.role != UserRole.DIRECTOR:
        stmt = stmt.where(Appointment.branch_id == user.branch_id)
    return list(db.scalars(stmt.limit(100)).all())


@router.post("/appointments", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Appointment:
    assert_branch_access(user, payload.branch_id)
    if user.role == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot create appointments")
    row = Appointment(**payload.model_dump(), created_by=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ---------- visits ----------

@router.get("/visits")
def list_visits(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(Visit).order_by(Visit.id.desc())
    if user.role != UserRole.DIRECTOR:
        stmt = stmt.where(Visit.branch_id == user.branch_id)
    rows = db.scalars(stmt.limit(100)).all()
    return [_visit_to_read(v, user) for v in rows]


@router.post("/visits", status_code=status.HTTP_201_CREATED)
def create_visit(
    payload: VisitCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    assert_branch_access(user, payload.branch_id)
    if user.role == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot create visits")
    row = Visit(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _visit_to_read(row, user)


@router.patch("/visits/{visit_id}")
def update_visit(
    visit_id: int,
    payload: VisitUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    row = db.get(Visit, visit_id)
    if not row:
        raise HTTPException(status_code=404, detail="Visit not found")
    assert_branch_access(user, row.branch_id)
    if user.role == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot update visits")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    if payload.status == VisitStatus.ACCEPTED and row.accepted_at is None:
        row.accepted_at = datetime.now(timezone.utc)
    if payload.approval_status == ApprovalStatus.APPROVED:
        row.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return _visit_to_read(row, user)


@router.get("/visits/{visit_id}")
def get_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    row = db.get(Visit, visit_id)
    if not row:
        raise HTTPException(status_code=404, detail="Visit not found")
    assert_branch_access(user, row.branch_id)
    return _visit_to_read(row, user)


@router.get("/visits/{visit_id}/work-orders")
def list_visit_work_orders(
    visit_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    visit = db.get(Visit, visit_id)
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    assert_branch_access(user, visit.branch_id)
    stmt = (
        select(WorkOrder)
        .where(WorkOrder.visit_id == visit_id)
        .options(*_wo_eager_options())
        .order_by(WorkOrder.id)
    )
    rows = db.scalars(stmt).all()
    result = []
    for wo in rows:
        try:
            assert_can_manage_work_order(user, wo)
        except HTTPException:
            continue
        result.append(_wo_to_read(wo, user))
    return result


# ---------- work orders ----------

@router.get("/work-orders")
def list_work_orders(
    branch_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[dict]:
    stmt = select(WorkOrder).options(*_wo_eager_options()).order_by(WorkOrder.id.desc())
    if user.role == UserRole.DIRECTOR:
        if branch_id:
            stmt = stmt.where(WorkOrder.branch_id == branch_id)
    elif user.role == UserRole.BRANCH_MANAGER:
        stmt = stmt.where(WorkOrder.branch_id == user.branch_id)
    else:
        stmt = stmt.where(
            or_(
                WorkOrder.primary_assignee_id == user.id,
                WorkOrder.id.in_(
                    select(WorkOrderItem.work_order_id).where(
                        WorkOrderItem.assignee_id == user.id
                    )
                ),
            )
        )
    rows = db.scalars(stmt.limit(100)).all()
    return [_wo_to_read(wo, user) for wo in rows]


@router.post("/work-orders", status_code=status.HTTP_201_CREATED)
def create_work_order(
    payload: WorkOrderCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    assert_branch_access(user, payload.branch_id)
    if user.role == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot create work orders")

    _validate_wo_client_vehicle(db, payload.client_id, payload.vehicle_id)
    _validate_wo_assignee(db, payload.primary_assignee_id, payload.branch_id)

    data = payload.model_dump(exclude={"items", "number"})
    number = (payload.number or "").strip() or f"DRAFT-{uuid4().hex[:12]}"
    wo = WorkOrder(**data, number=number, status=WorkOrderStatus.CREATED)
    db.add(wo)
    db.flush()
    if not (payload.number or "").strip():
        _assign_wo_number(db, wo)

    for item_data in payload.items:
        item = WorkOrderItem(
            work_order_id=wo.id,
            **item_data.model_dump(),
        )
        db.add(item)
    db.flush()
    recalc_work_order_totals(db, wo.id)
    db.commit()

    wo = _load_work_order(db, wo.id)
    assert wo is not None
    return _wo_to_read(wo, user)


@router.get("/work-orders/{work_order_id}")
def get_work_order(
    work_order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    wo = _load_work_order(db, work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    assert_can_manage_work_order(user, wo)
    return _wo_to_read(wo, user)


@router.patch("/work-orders/{work_order_id}")
def update_work_order(
    work_order_id: int,
    payload: WorkOrderUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    wo = _load_work_order(db, work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    assert_can_mutate_work_order_header(user, wo)

    updates = payload.model_dump(exclude_unset=True, exclude={"items"})

    if "branch_id" in updates:
        if updates["branch_id"] != wo.branch_id:
            if user.role != UserRole.DIRECTOR:
                raise HTTPException(
                    status_code=403, detail="Only director can change branch"
                )
            assert_branch_access(user, updates["branch_id"])
        elif user.role == UserRole.BRANCH_MANAGER:
            assert_branch_access(user, updates["branch_id"])

    new_branch_id = updates.get("branch_id", wo.branch_id)
    new_client_id = updates.get("client_id", wo.client_id)
    new_vehicle_id = updates.get("vehicle_id", wo.vehicle_id)
    new_assignee_id = updates.get(
        "primary_assignee_id", wo.primary_assignee_id
    )

    if "client_id" in updates or "vehicle_id" in updates:
        _validate_wo_client_vehicle(db, new_client_id, new_vehicle_id)
    if "primary_assignee_id" in updates or "branch_id" in updates:
        _validate_wo_assignee(db, new_assignee_id, new_branch_id)

    for key, value in updates.items():
        setattr(wo, key, value)

    if "primary_assignee_id" in updates and updates["primary_assignee_id"] is not None:
        wo.assigned_by = user.id
        wo.assigned_at = datetime.now(timezone.utc)

    if payload.items is not None:
        _replace_wo_items(db, wo, payload.items)

    db.flush()
    recalc_work_order_totals(db, wo.id)
    db.commit()
    wo = _load_work_order(db, wo.id)
    assert wo is not None
    return _wo_to_read(wo, user)


@router.post("/work-orders/{work_order_id}/assign")
def assign_work_order(
    work_order_id: int,
    payload: WorkOrderAssign,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    wo = _load_work_order(db, work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    assert_can_mutate_work_order_header(user, wo)

    assignee = db.get(User, payload.primary_assignee_id)
    if not assignee or assignee.role != UserRole.WORKER:
        raise HTTPException(status_code=400, detail="Assignee must be a worker")
    if assignee.branch_id != wo.branch_id:
        raise HTTPException(status_code=400, detail="Worker must belong to WO branch")

    wo.primary_assignee_id = payload.primary_assignee_id
    wo.assigned_by = user.id
    wo.assigned_at = datetime.now(timezone.utc)
    for item in wo.items:
        if item.assignee_id is None:
            item.assignee_id = payload.primary_assignee_id
            item.status = WorkOrderItemStatus.ASSIGNED

    if wo.status == WorkOrderStatus.CREATED:
        change_work_order_status(
            db, wo, WorkOrderStatus.ASSIGNED, user.id, note=payload.note or "Assigned"
        )
    db.commit()
    wo = _load_work_order(db, wo.id)
    assert wo is not None
    return _wo_to_read(wo, user)


@router.post("/work-orders/{work_order_id}/status")
def set_work_order_status(
    work_order_id: int,
    payload: WorkOrderStatusChange,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    wo = _load_work_order(db, work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    assert_can_mutate_work_order_header(user, wo)
    change_work_order_status(db, wo, payload.status, user.id, note=payload.note)
    db.commit()
    wo = _load_work_order(db, wo.id)
    assert wo is not None
    return _wo_to_read(wo, user)


@router.get("/work-orders/{work_order_id}/history", response_model=list[WorkOrderStatusHistoryRead])
def work_order_history(
    work_order_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    wo = db.scalars(
        select(WorkOrder)
        .where(WorkOrder.id == work_order_id)
        .options(*_wo_eager_options(), selectinload(WorkOrder.status_history))
    ).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    assert_can_manage_work_order(user, wo)
    return sorted(wo.status_history, key=lambda h: h.changed_at)


@router.post(
    "/work-orders/{work_order_id}/items",
    status_code=status.HTTP_201_CREATED,
)
def add_work_order_item(
    work_order_id: int,
    payload: WorkOrderItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    wo = db.get(WorkOrder, work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    assert_can_mutate_work_order_header(user, wo)
    item = WorkOrderItem(work_order_id=wo.id, **payload.model_dump())
    db.add(item)
    db.flush()
    recalc_work_order_totals(db, wo.id)
    db.commit()
    item = _load_work_order_item(db, item.id)
    assert item is not None
    return _item_to_read(item, user)


@router.patch("/work-order-items/{item_id}")
def update_work_order_item(
    item_id: int,
    payload: WorkOrderItemUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    item = db.get(WorkOrderItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    wo = db.get(WorkOrder, item.work_order_id)
    assert wo is not None

    updates = payload.model_dump(exclude_unset=True)
    if user.role == UserRole.WORKER:
        if not worker_can_update_item(user, item, wo):
            raise HTTPException(status_code=403, detail="Not your item")
        # workers may only change execution status
        allowed = {"status"}
        if set(updates.keys()) - allowed:
            raise HTTPException(status_code=403, detail="Workers may only update item status")
        if "unit_price" in updates or "qty" in updates:
            raise HTTPException(status_code=403, detail="Workers cannot change prices")
    else:
        assert_can_mutate_work_order_header(user, wo)

    for key, value in updates.items():
        setattr(item, key, value)

    if user.role != UserRole.WORKER and payload.assignee_id is not None:
        item.status = WorkOrderItemStatus.ASSIGNED
        if wo.status == WorkOrderStatus.CREATED:
            change_work_order_status(
                db, wo, WorkOrderStatus.ASSIGNED, user.id, note="Assigned via item"
            )
            wo.primary_assignee_id = wo.primary_assignee_id or payload.assignee_id
            wo.assigned_by = user.id
            wo.assigned_at = datetime.now(timezone.utc)

    db.flush()
    recalc_work_order_totals(db, wo.id)
    db.commit()
    item = _load_work_order_item(db, item.id)
    assert item is not None
    return _item_to_read(item, user)


@router.delete("/work-order-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_work_order_item(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    item = db.get(WorkOrderItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    wo = db.get(WorkOrder, item.work_order_id)
    assert wo is not None
    assert_can_mutate_work_order_header(user, wo)
    wo_id = item.work_order_id
    db.delete(item)
    db.flush()
    recalc_work_order_totals(db, wo_id)
    db.commit()


# ---------- payments ----------

@router.get("/payments", response_model=list[PaymentRead])
def list_payments(
    branch_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Payment]:
    assert_can_manage_finance(user)
    stmt = select(Payment).order_by(Payment.paid_at.desc())
    if user.role == UserRole.BRANCH_MANAGER:
        stmt = stmt.where(Payment.branch_id == user.branch_id)
    elif branch_id:
        stmt = stmt.where(Payment.branch_id == branch_id)
    return list(db.scalars(stmt.limit(100)).all())


@router.post("/payments", response_model=PaymentRead, status_code=status.HTTP_201_CREATED)
def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Payment:
    assert_can_manage_finance(user)
    wo = db.get(WorkOrder, payload.work_order_id)
    if not wo:
        raise HTTPException(status_code=404, detail="Work order not found")
    assert_branch_access(user, wo.branch_id)
    row = Payment(
        work_order_id=wo.id,
        branch_id=wo.branch_id,
        amount=payload.amount,
        method=payload.method,
        paid_at=payload.paid_at,
        comment=payload.comment,
        created_by=user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ---------- tasks ----------

@router.get("/tasks", response_model=list[TaskRead])
def list_tasks(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[Task]:
    stmt = select(Task).order_by(Task.id.desc())
    # Директор видит все; остальные — созданные ими или назначенные на них
    if user.role != UserRole.DIRECTOR:
        stmt = stmt.where(
            or_(Task.created_by == user.id, Task.assignee_id == user.id)
        )
    return list(db.scalars(stmt.limit(100)).all())


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Task:
    if user.role == UserRole.WORKER:
        raise HTTPException(status_code=403, detail="Workers cannot create tasks")
    data = payload.model_dump()
    if user.role == UserRole.BRANCH_MANAGER and data.get("branch_id") is None:
        data["branch_id"] = user.branch_id
    if data.get("branch_id") is not None:
        assert_branch_access(user, data["branch_id"])
    assignee = db.get(User, data["assignee_id"])
    if not assignee or not assignee.is_active:
        raise HTTPException(status_code=400, detail="Assignee not found")
    if user.role == UserRole.BRANCH_MANAGER:
        if assignee.branch_id != user.branch_id and assignee.id != user.id:
            raise HTTPException(
                status_code=403, detail="Can only assign tasks within own branch"
            )
    row = Task(**data, created_by=user.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.patch("/tasks/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Task:
    row = db.get(Task, task_id)
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    if user.role == UserRole.DIRECTOR:
        pass
    elif user.role == UserRole.WORKER:
        if row.assignee_id != user.id and row.created_by != user.id:
            raise HTTPException(status_code=403, detail="Not your task")
    elif user.role == UserRole.BRANCH_MANAGER:
        if row.created_by != user.id and row.assignee_id != user.id:
            if row.branch_id is None:
                raise HTTPException(status_code=403, detail="Not your task")
            assert_branch_access(user, row.branch_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return row
