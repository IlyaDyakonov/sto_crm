from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Identity, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import AppointmentStatus
from app.models.base import Base, TimestampMixin


class Appointment(Base, TimestampMixin):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), nullable=False, index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), index=True)
    touch_id: Mapped[int | None] = mapped_column(ForeignKey("touches.id"))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    service_request: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(
            AppointmentStatus,
            name="appointment_status",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=AppointmentStatus.NEW,
    )
    rescheduled_from_id: Mapped[int | None] = mapped_column(ForeignKey("appointments.id"))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
