from sqlalchemy import BigInteger, Boolean, Enum, ForeignKey, Identity, Text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import UserRole
from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), primary_key=True)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(CITEXT, unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(Text)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    branch_id: Mapped[int | None] = mapped_column(ForeignKey("branches.id"), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    branch: Mapped["Branch | None"] = relationship(back_populates="users")
