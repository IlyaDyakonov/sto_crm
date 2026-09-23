from decimal import Decimal

from sqlalchemy import BigInteger, Boolean, Identity, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Branch(Base, TimestampMixin):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    plan_monthly_revenue: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    users: Mapped[list["User"]] = relationship(back_populates="branch")
