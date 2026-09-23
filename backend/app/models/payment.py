from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Identity, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import PaymentMethod
from app.models.base import Base, TimestampMixin


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    work_order_id: Mapped[int] = mapped_column(
        ForeignKey("work_orders.id"), nullable=False, index=True
    )
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id"), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    comment: Mapped[str | None] = mapped_column(Text)

    work_order: Mapped["WorkOrder"] = relationship(back_populates="payments")
