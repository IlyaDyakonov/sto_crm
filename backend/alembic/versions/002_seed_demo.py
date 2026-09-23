"""seed demo data

Revision ID: 002_seed_demo
Revises: 001_initial
Create Date: 2026-09-23

Demo data for STO CRM (roles, visit with 2 work orders).
Applied automatically by `alembic upgrade head`.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_seed_demo"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    exists = conn.execute(
        sa.text("SELECT 1 FROM users WHERE email = 'director@sto.local' LIMIT 1")
    ).scalar()
    if exists:
        return

    op.execute(
        sa.text(
            """
            INSERT INTO branches (id, name, address, is_active, plan_monthly_revenue)
            VALUES
              (1, 'СТО на Ленина', 'ул. Ленина, 10', true, 2500000.00),
              (2, 'СТО Юг', 'Южный пр., 5', true, 1800000.00);

            INSERT INTO users (id, full_name, email, password_hash, role, branch_id, is_active)
            VALUES
              (1, 'Алексей Директоров', 'director@sto.local', NULL, 'director', NULL, true),
              (2, 'Ирина Руководителева', 'manager.lenina@sto.local', NULL, 'branch_manager', 1, true),
              (3, 'Павел Южный', 'manager.south@sto.local', NULL, 'branch_manager', 2, true),
              (4, 'Сергей Подвескин', 'worker.suspension@sto.local', NULL, 'worker', 1, true),
              (5, 'Дмитрий Маляр', 'worker.paint@sto.local', NULL, 'worker', 1, true),
              (6, 'Олег Южный', 'worker.south@sto.local', NULL, 'worker', 2, true);

            INSERT INTO clients (id, name, phone, email, client_type, notes)
            VALUES
              (1, 'Иван Петров', '+79001234567', 'ivan@example.com', 'person', 'Постоянный клиент'),
              (2, 'Такси Быстро', '+79007654321', NULL, 'company', NULL);

            INSERT INTO vehicles (id, client_id, plate_number, vin, make, model, year, mileage)
            VALUES
              (1, 1, 'А123ВС777', 'XTA21150000000001', 'Toyota', 'Camry', 2019, 82000),
              (2, 2, 'К456МН199', NULL, 'Hyundai', 'Solaris', 2021, 150000);

            INSERT INTO touches (
              id, client_id, vehicle_id, branch_id, channel, direction,
              subject, outcome, created_by, occurred_at
            )
            VALUES (
              1, 1, 1, 1, 'call', 'inbound',
              'Стучит подвеска, ещё царапина на крыле', 'recorded', 2,
              now() - interval '2 days'
            );

            INSERT INTO appointments (
              id, branch_id, client_id, vehicle_id, touch_id, scheduled_at,
              service_request, status, created_by
            )
            VALUES (
              1, 1, 1, 1, 1, now() - interval '1 day',
              'Диагностика подвески + осмотр ЛКП', 'arrived', 2
            );

            INSERT INTO visits (
              id, branch_id, appointment_id, client_id, vehicle_id,
              stage, status, complaint, diagnosis_summary, estimate_amount,
              approval_status, accepted_at, approved_at
            )
            VALUES (
              1, 1, 1, 1, 1,
              'done_for_wo', 'approved',
              'Стучит справа, царапина на переднем крыле',
              'Рычаг + локальная окраска крыла', 45000.00,
              'approved',
              now() - interval '1 day' - interval '2 hours',
              now() - interval '1 day' - interval '1 hour'
            );

            INSERT INTO work_orders (
              id, number, branch_id, visit_id, client_id, vehicle_id, title,
              status, primary_assignee_id, assigned_by, assigned_at,
              total_labor_amount, total_parts_amount, total_amount,
              is_warranty, urgency
            )
            VALUES
              (
                1, 'WO-2026-0001', 1, 1, 1, 1, 'Подвеска',
                'in_progress', 4, 2, now() - interval '20 hours',
                8000.00, 12000.00, 20000.00,
                false, 'normal'
              ),
              (
                2, 'WO-2026-0002', 1, 1, 1, 1, 'Окраска',
                'assigned', 5, 2, now() - interval '20 hours',
                15000.00, 5000.00, 20000.00,
                false, 'normal'
              );

            INSERT INTO work_order_items (
              id, work_order_id, title, description, item_type,
              qty, unit_price, amount, assignee_id, status, sort_order
            )
            VALUES
              (1, 1, 'Замена рычага', NULL, 'labor', 1, 8000.00, 8000.00, 4, 'in_progress', 1),
              (2, 1, 'Рычаг в сборе', NULL, 'part', 1, 12000.00, 12000.00, 4, 'done', 2),
              (3, 2, 'Локальная окраска крыла', NULL, 'labor', 1, 15000.00, 15000.00, 5, 'assigned', 1),
              (4, 2, 'Краска / материалы', NULL, 'part', 1, 5000.00, 5000.00, 5, 'waiting_parts', 2);

            INSERT INTO work_order_status_history (
              work_order_id, from_status, to_status, changed_by, note, changed_at
            )
            VALUES
              (1, NULL, 'created', 2, 'Created', now() - interval '22 hours'),
              (1, 'created', 'assigned', 2, 'Assigned to Sergey', now() - interval '20 hours'),
              (1, 'assigned', 'in_progress', 2, NULL, now() - interval '18 hours');

            INSERT INTO payments (
              work_order_id, branch_id, amount, method, paid_at, created_by, comment
            )
            VALUES (
              1, 1, 10000.00, 'card', now() - interval '10 hours', 2, 'Предоплата'
            );

            INSERT INTO tasks (
              branch_id, client_id, vehicle_id, work_order_id, assignee_id,
              task_type, title, due_at, status, created_by
            )
            VALUES
              (
                1, 1, 1, 2, 2, 'callback',
                'Согласовать допы по окраске', now() + interval '1 day', 'open', 2
              ),
              (
                1, 1, 1, 1, 4, 'other',
                'Завершить замену рычага', now() + interval '8 hours', 'in_progress', 2
              );
            """
        )
    )

    # Keep identity sequences in sync after explicit IDs
    for table in (
        "branches",
        "users",
        "clients",
        "vehicles",
        "touches",
        "appointments",
        "visits",
        "work_orders",
        "work_order_items",
        "payments",
        "tasks",
        "work_order_status_history",
    ):
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
            DELETE FROM tasks WHERE id IN (
              SELECT id FROM tasks WHERE created_by = 2 AND title IN (
                'Согласовать допы по окраске', 'Завершить замену рычага'
              )
            );
            DELETE FROM payments WHERE work_order_id IN (1, 2);
            DELETE FROM work_order_status_history WHERE work_order_id IN (1, 2);
            DELETE FROM work_order_items WHERE work_order_id IN (1, 2);
            DELETE FROM work_orders WHERE id IN (1, 2);
            DELETE FROM visits WHERE id = 1;
            DELETE FROM appointments WHERE id = 1;
            DELETE FROM touches WHERE id = 1;
            DELETE FROM vehicles WHERE id IN (1, 2);
            DELETE FROM clients WHERE id IN (1, 2);
            DELETE FROM users WHERE id IN (1, 2, 3, 4, 5, 6);
            DELETE FROM branches WHERE id IN (1, 2);
            """
        )
    )
