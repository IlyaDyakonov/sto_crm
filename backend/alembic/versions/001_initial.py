"""initial schema

Revision ID: 001_initial
Revises:
Create Date: 2026-09-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")

    user_role = postgresql.ENUM(
        "director", "branch_manager", "worker", name="user_role", create_type=False
    )
    client_type = postgresql.ENUM("person", "company", name="client_type", create_type=False)
    touch_channel = postgresql.ENUM(
        "call",
        "whatsapp",
        "site",
        "walk_in",
        "referral",
        "other",
        name="touch_channel",
        create_type=False,
    )
    touch_direction = postgresql.ENUM(
        "inbound", "outbound", name="touch_direction", create_type=False
    )
    touch_outcome = postgresql.ENUM(
        "recorded", "callback", "rejected", "spam", name="touch_outcome", create_type=False
    )
    appointment_status = postgresql.ENUM(
        "new",
        "confirmed",
        "arrived",
        "no_show",
        "cancelled",
        "rescheduled",
        name="appointment_status",
        create_type=False,
    )
    visit_stage = postgresql.ENUM(
        "intake",
        "diagnosis",
        "approval",
        "done_for_wo",
        "lost",
        name="visit_stage",
        create_type=False,
    )
    visit_status = postgresql.ENUM(
        "waiting_intake",
        "accepted",
        "in_diagnosis",
        "pending_approval",
        "approved",
        "lost",
        "cancelled",
        name="visit_status",
        create_type=False,
    )
    approval_status = postgresql.ENUM(
        "pending", "approved", "rejected", "thinking", name="approval_status", create_type=False
    )
    work_order_status = postgresql.ENUM(
        "created",
        "assigned",
        "waiting_parts",
        "in_progress",
        "work_completed",
        "ready_for_pickup",
        "delivered",
        "closed",
        "cancelled",
        name="work_order_status",
        create_type=False,
    )
    work_order_item_type = postgresql.ENUM(
        "labor", "part", name="work_order_item_type", create_type=False
    )
    work_order_item_status = postgresql.ENUM(
        "pending",
        "assigned",
        "waiting_parts",
        "in_progress",
        "done",
        name="work_order_item_status",
        create_type=False,
    )
    urgency = postgresql.ENUM("normal", "high", "tow", name="urgency", create_type=False)
    payment_method = postgresql.ENUM(
        "cash", "card", "transfer", "mixed", name="payment_method", create_type=False
    )
    task_type = postgresql.ENUM(
        "callback",
        "approve_extras",
        "remind_service",
        "pickup",
        "escalation",
        "other",
        name="task_type",
        create_type=False,
    )
    task_status = postgresql.ENUM(
        "open", "in_progress", "done", "cancelled", name="task_status", create_type=False
    )

    for enum_type in (
        user_role,
        client_type,
        touch_channel,
        touch_direction,
        touch_outcome,
        appointment_status,
        visit_stage,
        visit_status,
        approval_status,
        work_order_status,
        work_order_item_type,
        work_order_item_status,
        urgency,
        payment_method,
        task_type,
        task_status,
    ):
        enum_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "branches",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("plan_monthly_revenue", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=True),
        sa.Column(
            "role",
            postgresql.ENUM(
                "director", "branch_manager", "worker", name="user_role", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("branch_id", sa.BigInteger(), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_branch_id", "users", ["branch_id"])

    op.create_table(
        "clients",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("phone", sa.Text(), nullable=False),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column(
            "client_type",
            postgresql.ENUM("person", "company", name="client_type", create_type=False),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_clients_phone", "clients", ["phone"])

    op.create_table(
        "vehicles",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("plate_number", sa.Text(), nullable=False),
        sa.Column("vin", sa.Text(), nullable=True),
        sa.Column("make", sa.Text(), nullable=False),
        sa.Column("model", sa.Text(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("mileage", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("plate_number"),
    )
    op.create_index("ix_vehicles_client_id", "vehicles", ["client_id"])
    op.create_index("ix_vehicles_plate_number", "vehicles", ["plate_number"])

    op.create_table(
        "touches",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("vehicle_id", sa.BigInteger(), sa.ForeignKey("vehicles.id"), nullable=True),
        sa.Column("branch_id", sa.BigInteger(), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column(
            "channel",
            postgresql.ENUM(
                "call",
                "whatsapp",
                "site",
                "walk_in",
                "referral",
                "other",
                name="touch_channel",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "direction",
            postgresql.ENUM("inbound", "outbound", name="touch_direction", create_type=False),
            nullable=False,
        ),
        sa.Column("subject", sa.Text(), nullable=True),
        sa.Column(
            "outcome",
            postgresql.ENUM(
                "recorded", "callback", "rejected", "spam", name="touch_outcome", create_type=False
            ),
            nullable=True,
        ),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_touches_client_id", "touches", ["client_id"])
    op.create_index("ix_touches_vehicle_id", "touches", ["vehicle_id"])
    op.create_index("ix_touches_branch_id", "touches", ["branch_id"])

    op.create_table(
        "appointments",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column("branch_id", sa.BigInteger(), sa.ForeignKey("branches.id"), nullable=False),
        sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("vehicle_id", sa.BigInteger(), sa.ForeignKey("vehicles.id"), nullable=True),
        sa.Column("touch_id", sa.BigInteger(), sa.ForeignKey("touches.id"), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("service_request", sa.Text(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(
                "new",
                "confirmed",
                "arrived",
                "no_show",
                "cancelled",
                "rescheduled",
                name="appointment_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "rescheduled_from_id",
            sa.BigInteger(),
            sa.ForeignKey("appointments.id"),
            nullable=True,
        ),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_appointments_branch_id", "appointments", ["branch_id"])
    op.create_index("ix_appointments_client_id", "appointments", ["client_id"])
    op.create_index("ix_appointments_vehicle_id", "appointments", ["vehicle_id"])

    op.create_table(
        "visits",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column("branch_id", sa.BigInteger(), sa.ForeignKey("branches.id"), nullable=False),
        sa.Column("appointment_id", sa.BigInteger(), sa.ForeignKey("appointments.id"), nullable=True),
        sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("vehicle_id", sa.BigInteger(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column(
            "stage",
            postgresql.ENUM(
                "intake",
                "diagnosis",
                "approval",
                "done_for_wo",
                "lost",
                name="visit_stage",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(
                "waiting_intake",
                "accepted",
                "in_diagnosis",
                "pending_approval",
                "approved",
                "lost",
                "cancelled",
                name="visit_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("complaint", sa.Text(), nullable=True),
        sa.Column("diagnosis_summary", sa.Text(), nullable=True),
        sa.Column("estimate_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column(
            "approval_status",
            postgresql.ENUM(
                "pending", "approved", "rejected", "thinking", name="approval_status", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("lost_reason", sa.Text(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_visits_branch_id", "visits", ["branch_id"])
    op.create_index("ix_visits_client_id", "visits", ["client_id"])
    op.create_index("ix_visits_vehicle_id", "visits", ["vehicle_id"])

    op.create_table(
        "work_orders",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column("number", sa.Text(), nullable=False),
        sa.Column("branch_id", sa.BigInteger(), sa.ForeignKey("branches.id"), nullable=False),
        sa.Column("visit_id", sa.BigInteger(), sa.ForeignKey("visits.id"), nullable=True),
        sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("vehicle_id", sa.BigInteger(), sa.ForeignKey("vehicles.id"), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "created",
                "assigned",
                "waiting_parts",
                "in_progress",
                "work_completed",
                "ready_for_pickup",
                "delivered",
                "closed",
                "cancelled",
                name="work_order_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("primary_assignee_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("assigned_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "total_labor_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "total_parts_amount",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("is_warranty", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "parent_work_order_id",
            sa.BigInteger(),
            sa.ForeignKey("work_orders.id"),
            nullable=True,
        ),
        sa.Column(
            "urgency",
            postgresql.ENUM("normal", "high", "tow", name="urgency", create_type=False),
            nullable=False,
        ),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("ready_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint("number"),
    )
    op.create_index("ix_work_orders_branch_status", "work_orders", ["branch_id", "status"])
    op.create_index("ix_work_orders_visit_id", "work_orders", ["visit_id"])
    op.create_index("ix_work_orders_vehicle_id", "work_orders", ["vehicle_id"])
    op.create_index("ix_work_orders_primary_assignee_id", "work_orders", ["primary_assignee_id"])
    op.create_index("ix_work_orders_client_id", "work_orders", ["client_id"])

    op.create_table(
        "work_order_items",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column(
            "work_order_id", sa.BigInteger(), sa.ForeignKey("work_orders.id"), nullable=False
        ),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "item_type",
            postgresql.ENUM("labor", "part", name="work_order_item_type", create_type=False),
            nullable=False,
        ),
        sa.Column("qty", sa.Numeric(12, 2), nullable=False),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("assignee_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "pending",
                "assigned",
                "waiting_parts",
                "in_progress",
                "done",
                name="work_order_item_status",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_work_order_items_work_order_id", "work_order_items", ["work_order_id"])
    op.create_index("ix_work_order_items_assignee_id", "work_order_items", ["assignee_id"])

    op.create_table(
        "work_order_status_history",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column(
            "work_order_id", sa.BigInteger(), sa.ForeignKey("work_orders.id"), nullable=False
        ),
        sa.Column("from_status", sa.Text(), nullable=True),
        sa.Column("to_status", sa.Text(), nullable=False),
        sa.Column("changed_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_work_order_status_history_work_order_id",
        "work_order_status_history",
        ["work_order_id"],
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column(
            "work_order_id", sa.BigInteger(), sa.ForeignKey("work_orders.id"), nullable=False
        ),
        sa.Column("branch_id", sa.BigInteger(), sa.ForeignKey("branches.id"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "method",
            postgresql.ENUM(
                "cash", "card", "transfer", "mixed", name="payment_method", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_payments_work_order_id", "payments", ["work_order_id"])
    op.create_index("ix_payments_branch_id", "payments", ["branch_id"])

    op.create_table(
        "tasks",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=False), primary_key=True),
        sa.Column("branch_id", sa.BigInteger(), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("client_id", sa.BigInteger(), sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("vehicle_id", sa.BigInteger(), sa.ForeignKey("vehicles.id"), nullable=True),
        sa.Column("work_order_id", sa.BigInteger(), sa.ForeignKey("work_orders.id"), nullable=True),
        sa.Column("assignee_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "task_type",
            postgresql.ENUM(
                "callback",
                "approve_extras",
                "remind_service",
                "pickup",
                "escalation",
                "other",
                name="task_type",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(
                "open", "in_progress", "done", "cancelled", name="task_status", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("created_by", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_tasks_branch_id", "tasks", ["branch_id"])
    op.create_index("ix_tasks_client_id", "tasks", ["client_id"])
    op.create_index("ix_tasks_work_order_id", "tasks", ["work_order_id"])
    op.create_index("ix_tasks_assignee_id", "tasks", ["assignee_id"])


def downgrade() -> None:
    op.drop_table("tasks")
    op.drop_table("payments")
    op.drop_table("work_order_status_history")
    op.drop_table("work_order_items")
    op.drop_table("work_orders")
    op.drop_table("visits")
    op.drop_table("appointments")
    op.drop_table("touches")
    op.drop_table("vehicles")
    op.drop_table("clients")
    op.drop_table("users")
    op.drop_table("branches")

    for name in (
        "task_status",
        "task_type",
        "payment_method",
        "urgency",
        "work_order_item_status",
        "work_order_item_type",
        "work_order_status",
        "approval_status",
        "visit_status",
        "visit_stage",
        "appointment_status",
        "touch_outcome",
        "touch_direction",
        "touch_channel",
        "client_type",
        "user_role",
    ):
        op.execute(sa.text(f"DROP TYPE IF EXISTS {name}"))
