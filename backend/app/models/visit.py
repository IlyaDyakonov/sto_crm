from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Identity, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import ApprovalStatus, VisitStage, VisitStatus
from app.models.base import Base, TimestampMixin


class Visit(Base, TimestampMixin):
    __tablename__ = "visits"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), nullable=False, index=True)
    appointment_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False, index=True)
    stage: Mapped[VisitStage] = mapped_column(
        Enum(VisitStage, name="visit_stage", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=VisitStage.INTAKE,
    )
    status: Mapped[VisitStatus] = mapped_column(
        Enum(VisitStatus, name="visit_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=VisitStatus.WAITING_INTAKE,
    )
    complaint: Mapped[str | None] = mapped_column(Text)
    diagnosis_summary: Mapped[str | None] = mapped_column(Text)
    estimate_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus, name="approval_status", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ApprovalStatus.PENDING,
    )
    lost_reason: Mapped[str | None] = mapped_column(Text)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    work_orders: Mapped[list["WorkOrder"]] = relationship(back_populates="visit")
