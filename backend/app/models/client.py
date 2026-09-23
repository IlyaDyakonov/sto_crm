from sqlalchemy import BigInteger, Enum, Identity, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import ClientType
from app.models.base import Base, TimestampMixin


class Client(Base, TimestampMixin):
    __tablename__ = "clients"
    __table_args__ = (Index("ix_clients_phone", "phone"),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str | None] = mapped_column(Text)
    client_type: Mapped[ClientType] = mapped_column(
        Enum(ClientType, name="client_type", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=ClientType.PERSON,
    )
    notes: Mapped[str | None] = mapped_column(Text)

    vehicles: Mapped[list["Vehicle"]] = relationship(back_populates="client")
