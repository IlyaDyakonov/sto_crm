from sqlalchemy import BigInteger, ForeignKey, Identity, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Vehicle(Base, TimestampMixin):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id"), nullable=False, index=True)
    plate_number: Mapped[str] = mapped_column(Text, nullable=False, unique=True, index=True)
    vin: Mapped[str | None] = mapped_column(Text)
    make: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    year: Mapped[int | None] = mapped_column(Integer)
    mileage: Mapped[int | None] = mapped_column(Integer)

    client: Mapped["Client"] = relationship(back_populates="vehicles")
