from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Identity, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.enums import TouchChannel, TouchDirection, TouchOutcome
from app.models.base import Base, TimestampMixin


class Touch(Base, TimestampMixin):
    __tablename__ = "touches"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    client_id: Mapped[int | None] = mapped_column(ForeignKey("clients.id"), index=True)
    vehicle_id: Mapped[int | None] = mapped_column(ForeignKey("vehicles.id"), index=True)
    branch_id: Mapped[int | None] = mapped_column(ForeignKey("branches.id"), index=True)
    channel: Mapped[TouchChannel] = mapped_column(
        Enum(TouchChannel, name="touch_channel", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    direction: Mapped[TouchDirection] = mapped_column(
        Enum(TouchDirection, name="touch_direction", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    subject: Mapped[str | None] = mapped_column(Text)
    outcome: Mapped[TouchOutcome | None] = mapped_column(
        Enum(TouchOutcome, name="touch_outcome", values_callable=lambda x: [e.value for e in x]),
    )
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
