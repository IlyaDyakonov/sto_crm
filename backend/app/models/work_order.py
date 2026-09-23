from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Numeric,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import (
    Urgency,
    WorkOrderItemStatus,
    WorkOrderItemType,
    WorkOrderStatus,
)
from app.models.base import Base, TimestampMixin


class WorkOrder(Base, TimestampMixin):
    __tablename__ = "work_orders"
    __table_args__ = (
        Index("ix_work_orders_branch_status", "branch_id", "status"),
        Index("ix_work_orders_visit_id", "visit_id"),
        Index("ix_work_orders_vehicle_id", "vehicle_id"),
        Index("ix_work_orders_primary_assignee_id", "primary_assignee_id"),
        Index("ix_work_orders_client_id", "client_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    number: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), nullable=False)
    visit_id: Mapped[int | None] = mapped_column(ForeignKey("visits.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False)
    title: Mapped[str | None] = mapped_column(Text)
    status: Mapped[WorkOrderStatus] = mapped_column(
        Enum(
            WorkOrderStatus,
            name="work_order_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=WorkOrderStatus.CREATED,
    )
    primary_assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    assigned_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    assigned_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total_labor_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    total_parts_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), nullable=False, default=Decimal("0.00")
    )
    is_warranty: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    parent_work_order_id: Mapped[int | None] = mapped_column(ForeignKey("work_orders.id"))
    urgency: Mapped[Urgency] = mapped_column(
        Enum(Urgency, name="urgency", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=Urgency.NORMAL,
    )
    notes: Mapped[str | None] = mapped_column(Text)
    ready_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    visit: Mapped["Visit | None"] = relationship(back_populates="work_orders")
    branch: Mapped["Branch"] = relationship()
    client: Mapped["Client"] = relationship()
    vehicle: Mapped["Vehicle"] = relationship()
    primary_assignee: Mapped["User | None"] = relationship(
        foreign_keys=[primary_assignee_id]
    )
    items: Mapped[list["WorkOrderItem"]] = relationship(
        back_populates="work_order", cascade="all, delete-orphan"
    )
    status_history: Mapped[list["WorkOrderStatusHistory"]] = relationship(
        back_populates="work_order", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="work_order")


class WorkOrderItem(Base, TimestampMixin):
    __tablename__ = "work_order_items"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    work_order_id: Mapped[int] = mapped_column(
        ForeignKey("work_orders.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    item_type: Mapped[WorkOrderItemType] = mapped_column(
        Enum(
            WorkOrderItemType,
            name="work_order_item_type",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )
    qty: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("1"))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0.00"))
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[WorkOrderItemStatus] = mapped_column(
        Enum(
            WorkOrderItemStatus,
            name="work_order_item_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=WorkOrderItemStatus.PENDING,
    )
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    work_order: Mapped["WorkOrder"] = relationship(back_populates="items")
    assignee: Mapped["User | None"] = relationship(foreign_keys=[assignee_id])


class WorkOrderStatusHistory(Base):
    __tablename__ = "work_order_status_history"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    work_order_id: Mapped[int] = mapped_column(
        ForeignKey("work_orders.id"), nullable=False, index=True
    )
    from_status: Mapped[str | None] = mapped_column(Text)
    to_status: Mapped[str] = mapped_column(Text, nullable=False)
    changed_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    note: Mapped[str | None] = mapped_column(Text)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    work_order: Mapped["WorkOrder"] = relationship(back_populates="status_history")
