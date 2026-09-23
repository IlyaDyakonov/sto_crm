"""expand demo work orders for all statuses

Revision ID: 003_expand_wo_seed
Revises: 002_seed_demo
Create Date: 2026-09-23

Ensures every work_order status has 1–3 demo rows (for kanban).
Safe on DBs that already have extra/manual WOs: uses new numbers
WO-KANBAN-* and lets identity assign ids.
Fresh installs with full 002 (WO-2026-0019 present) skip this.
"""

from datetime import datetime, timedelta, timezone
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_expand_wo_seed"
down_revision: Union[str, None] = "002_seed_demo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TARGETS: dict[str, int] = {
    "created": 2,
    "assigned": 2,
    "waiting_parts": 2,
    "in_progress": 2,
    "work_completed": 2,
    "ready_for_pickup": 2,
    "delivered": 2,
    "closed": 3,
    "cancelled": 2,
}

STATUS_META: dict[str, tuple[float, float, str]] = {
    "created": (5000.0, 3000.0, "Смета"),
    "assigned": (7000.0, 4000.0, "Назначен"),
    "waiting_parts": (8000.0, 12000.0, "Ждём запчасть"),
    "in_progress": (9000.0, 6000.0, "В работе"),
    "work_completed": (4500.0, 2500.0, "Завершён"),
    "ready_for_pickup": (5500.0, 2000.0, "К выдаче"),
    "delivered": (6000.0, 1500.0, "Выдан"),
    "closed": (7500.0, 4500.0, "Закрыт"),
    "cancelled": (10000.0, 0.0, "Отменён"),
}

ITEM_STATUS = {
    "created": "pending",
    "assigned": "assigned",
    "waiting_parts": "waiting_parts",
    "in_progress": "in_progress",
    "work_completed": "done",
    "ready_for_pickup": "done",
    "delivered": "done",
    "closed": "done",
    "cancelled": "pending",
}


def upgrade() -> None:
    conn = op.get_bind()

    full_seed = conn.execute(
        sa.text("SELECT 1 FROM work_orders WHERE number = 'WO-2026-0019' LIMIT 1")
    ).scalar()
    if full_seed:
        return

    already = conn.execute(
        sa.text("SELECT 1 FROM work_orders WHERE number LIKE 'WO-KANBAN-%' LIMIT 1")
    ).scalar()
    if already:
        return

    branch_id = conn.execute(sa.text("SELECT id FROM branches ORDER BY id LIMIT 1")).scalar()
    client_id = conn.execute(sa.text("SELECT id FROM clients ORDER BY id LIMIT 1")).scalar()
    vehicle_id = conn.execute(
        sa.text(
            "SELECT id FROM vehicles WHERE client_id = :cid ORDER BY id LIMIT 1"
        ),
        {"cid": client_id},
    ).scalar()
    manager_id = conn.execute(
        sa.text(
            "SELECT id FROM users WHERE role IN ('branch_manager', 'director') "
            "ORDER BY id LIMIT 1"
        )
    ).scalar()
    worker_id = conn.execute(
        sa.text(
            "SELECT id FROM users WHERE role = 'worker' AND branch_id = :bid "
            "ORDER BY id LIMIT 1"
        ),
        {"bid": branch_id},
    ).scalar()
    if worker_id is None:
        worker_id = conn.execute(
            sa.text("SELECT id FROM users WHERE role = 'worker' ORDER BY id LIMIT 1")
        ).scalar()

    if not all([branch_id, client_id, vehicle_id, manager_id]):
        return

    counts = {
        row[0]: int(row[1])
        for row in conn.execute(
            sa.text("SELECT status::text, count(*) FROM work_orders GROUP BY 1")
        )
    }

    insert_wo = sa.text(
        """
        INSERT INTO work_orders (
          number, branch_id, visit_id, client_id, vehicle_id, title,
          status, primary_assignee_id, assigned_by, assigned_at,
          total_labor_amount, total_parts_amount, total_amount,
          is_warranty, urgency, notes,
          ready_at, delivered_at, closed_at
        )
        VALUES (
          :number, :branch_id, NULL, :client_id, :vehicle_id, :title,
          CAST(:status AS work_order_status),
          :assignee, :assigned_by, :assigned_at,
          :labor, :parts, :total,
          false, 'normal', :notes,
          :ready_at, :delivered_at, :closed_at
        )
        RETURNING id
        """
    )
    insert_item = sa.text(
        """
        INSERT INTO work_order_items (
          work_order_id, title, description, item_type,
          qty, unit_price, amount, assignee_id, status, sort_order
        )
        VALUES (
          :wo_id, :title, NULL, CAST(:item_type AS work_order_item_type),
          1, :price, :price, :assignee,
          CAST(:item_status AS work_order_item_status), :sort
        )
        """
    )
    insert_pay = sa.text(
        """
        INSERT INTO payments (
          work_order_id, branch_id, amount, method, paid_at, created_by, comment
        )
        VALUES (
          :wo_id, :branch_id, :amount, 'card', :paid_at, :created_by, :comment
        )
        """
    )

    now = datetime.now(timezone.utc)

    for status, target in TARGETS.items():
        have = counts.get(status, 0)
        need = max(0, target - have)
        labor, parts, label = STATUS_META[status]
        total = labor + parts

        for i in range(1, need + 1):
            n = have + i
            number = f"WO-KANBAN-{status}-{n}"

            has_assignee = status not in ("created",) and not (
                status == "cancelled" and n == 1
            )
            assignee = worker_id if has_assignee else None
            assigned_by = manager_id if has_assignee or status == "cancelled" else None
            assigned_at = now - timedelta(days=2) if assigned_by else None

            ready_at = delivered_at = closed_at = None
            if status in ("ready_for_pickup", "delivered", "closed"):
                ready_at = now - timedelta(days=1)
            if status in ("delivered", "closed"):
                delivered_at = now - timedelta(hours=12)
            if status == "closed":
                closed_at = now - timedelta(hours=6)

            wo_id = conn.execute(
                insert_wo,
                {
                    "number": number,
                    "branch_id": branch_id,
                    "client_id": client_id,
                    "vehicle_id": vehicle_id,
                    "title": f"{label} #{n}",
                    "status": status,
                    "assignee": assignee,
                    "assigned_by": assigned_by,
                    "assigned_at": assigned_at,
                    "labor": labor,
                    "parts": parts,
                    "total": total,
                    "notes": f"Демо канбан: {label}",
                    "ready_at": ready_at,
                    "delivered_at": delivered_at,
                    "closed_at": closed_at,
                },
            ).scalar()

            item_status = ITEM_STATUS[status]
            conn.execute(
                insert_item,
                {
                    "wo_id": wo_id,
                    "title": f"Работа: {label}",
                    "item_type": "labor",
                    "price": labor,
                    "assignee": assignee,
                    "item_status": item_status,
                    "sort": 1,
                },
            )
            if parts > 0:
                conn.execute(
                    insert_item,
                    {
                        "wo_id": wo_id,
                        "title": f"Запчасть: {label}",
                        "item_type": "part",
                        "price": parts,
                        "assignee": assignee,
                        "item_status": item_status,
                        "sort": 2,
                    },
                )

            if status in ("delivered", "closed"):
                conn.execute(
                    insert_pay,
                    {
                        "wo_id": wo_id,
                        "branch_id": branch_id,
                        "amount": total if status == "closed" else total / 2,
                        "paid_at": now - timedelta(days=1),
                        "created_by": manager_id,
                        "comment": "Демо оплата канбан",
                    },
                )

    for table in ("work_orders", "work_order_items", "payments"):
        op.execute(
            sa.text(
                f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), "
                f"COALESCE((SELECT MAX(id) FROM {table}), 1))"
            )
        )


def downgrade() -> None:
    op.execute(
        sa.text(
            """
            DELETE FROM payments
            WHERE work_order_id IN (
              SELECT id FROM work_orders WHERE number LIKE 'WO-KANBAN-%'
            );
            DELETE FROM work_order_items
            WHERE work_order_id IN (
              SELECT id FROM work_orders WHERE number LIKE 'WO-KANBAN-%'
            );
            DELETE FROM work_order_status_history
            WHERE work_order_id IN (
              SELECT id FROM work_orders WHERE number LIKE 'WO-KANBAN-%'
            );
            DELETE FROM work_orders WHERE number LIKE 'WO-KANBAN-%';
            """
        )
    )
