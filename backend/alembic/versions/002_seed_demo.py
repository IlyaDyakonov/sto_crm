"""seed demo data

Revision ID: 002_seed_demo
Revises: 001_initial
Create Date: 2026-09-23

Demo data for STO CRM: branches, roles, clients, visits,
work orders covering every WO status (1–3 per status for kanban).
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
              (2, 'Такси Быстро', '+79007654321', NULL, 'company', NULL),
              (3, 'Мария Козлова', '+79005551234', 'maria@example.com', 'person', NULL),
              (4, 'ООО Логистик', '+79003334455', 'fleet@logistic.example', 'company', 'Корп. парк'),
              (5, 'Андрей Смирнов', '+79009876543', NULL, 'person', NULL);

            INSERT INTO vehicles (id, client_id, plate_number, vin, make, model, year, mileage)
            VALUES
              (1, 1, 'А123ВС777', 'XTA21150000000001', 'Toyota', 'Camry', 2019, 82000),
              (2, 2, 'К456МН199', NULL, 'Hyundai', 'Solaris', 2021, 150000),
              (3, 3, 'Е789ОР777', NULL, 'Kia', 'Rio', 2020, 64000),
              (4, 4, 'Т111ТА199', NULL, 'VW', 'Polo', 2018, 210000),
              (5, 4, 'Т222ТА199', NULL, 'Skoda', 'Octavia', 2019, 175000),
              (6, 5, 'М555СК777', NULL, 'BMW', '320i', 2017, 98000),
              (7, 1, 'А321ВС777', NULL, 'Toyota', 'RAV4', 2022, 31000);

            INSERT INTO touches (
              id, client_id, vehicle_id, branch_id, channel, direction,
              subject, outcome, created_by, occurred_at
            )
            VALUES
              (
                1, 1, 1, 1, 'call', 'inbound',
                'Стучит подвеска, ещё царапина на крыле', 'recorded', 2,
                now() - interval '2 days'
              ),
              (
                2, 3, 3, 1, 'whatsapp', 'inbound',
                'ТО и замена колодок', 'recorded', 2,
                now() - interval '5 days'
              ),
              (
                3, 4, 4, 2, 'site', 'inbound',
                'Диагностика двигателя таксопарка', 'recorded', 3,
                now() - interval '8 days'
              ),
              (
                4, 5, 6, 1, 'walk_in', 'inbound',
                'Кондиционер не холодит', 'recorded', 2,
                now() - interval '12 days'
              );

            INSERT INTO appointments (
              id, branch_id, client_id, vehicle_id, touch_id, scheduled_at,
              service_request, status, created_by
            )
            VALUES
              (
                1, 1, 1, 1, 1, now() - interval '1 day',
                'Диагностика подвески + осмотр ЛКП', 'arrived', 2
              ),
              (
                2, 1, 3, 3, 2, now() - interval '4 days',
                'ТО + колодки', 'arrived', 2
              ),
              (
                3, 2, 4, 4, 3, now() - interval '7 days',
                'Двигатель / ошибка Check Engine', 'arrived', 3
              ),
              (
                4, 1, 5, 6, 4, now() - interval '11 days',
                'Климат / кондиционер', 'arrived', 2
              ),
              (
                5, 2, 4, 5, NULL, now() - interval '15 days',
                'Замена сцепления', 'arrived', 3
              ),
              (
                6, 1, 1, 7, NULL, now() - interval '20 days',
                'Шиномонтаж + сход-развал', 'arrived', 2
              );

            INSERT INTO visits (
              id, branch_id, appointment_id, client_id, vehicle_id,
              stage, status, complaint, diagnosis_summary, estimate_amount,
              approval_status, accepted_at, approved_at
            )
            VALUES
              (
                1, 1, 1, 1, 1,
                'done_for_wo', 'approved',
                'Стучит справа, царапина на переднем крыле',
                'Рычаг + локальная окраска крыла', 45000.00,
                'approved',
                now() - interval '1 day' - interval '2 hours',
                now() - interval '1 day' - interval '1 hour'
              ),
              (
                2, 1, 2, 3, 3,
                'done_for_wo', 'approved',
                'Плановое ТО, скрип тормозов',
                'ТО-60 + передние колодки', 28000.00,
                'approved',
                now() - interval '4 days',
                now() - interval '4 days' + interval '1 hour'
              ),
              (
                3, 2, 3, 4, 4,
                'done_for_wo', 'approved',
                'Троит, Check Engine',
                'Катушки + свечи + промывка', 35000.00,
                'approved',
                now() - interval '7 days',
                now() - interval '7 days' + interval '2 hours'
              ),
              (
                4, 1, 4, 5, 6,
                'done_for_wo', 'approved',
                'Не холодит',
                'Заправка фреона + осушитель', 18000.00,
                'approved',
                now() - interval '11 days',
                now() - interval '11 days' + interval '1 hour'
              ),
              (
                5, 2, 5, 4, 5,
                'done_for_wo', 'approved',
                'Пробуксовка сцепления',
                'Комплект сцепления', 52000.00,
                'approved',
                now() - interval '15 days',
                now() - interval '15 days' + interval '3 hours'
              ),
              (
                6, 1, 6, 1, 7,
                'done_for_wo', 'approved',
                'Сезонная смена шин',
                'Шиномонтаж 4 колеса + сход-развал', 9000.00,
                'approved',
                now() - interval '20 days',
                now() - interval '20 days' + interval '30 minutes'
              ),
              (
                7, 1, NULL, 2, 2,
                'done_for_wo', 'approved',
                'Walk-in: стук в подвеске (парк)',
                'Стойки стабилизатора', 12000.00,
                'approved',
                now() - interval '3 days',
                now() - interval '3 days' + interval '40 minutes'
              );

            -- Work orders: 1–3 per status for kanban demo
            -- created ×2 | assigned ×2 | waiting_parts ×2 | in_progress ×2
            -- work_completed ×2 | ready_for_pickup ×2 | delivered ×2
            -- closed ×3 | cancelled ×2
            INSERT INTO work_orders (
              id, number, branch_id, visit_id, client_id, vehicle_id, title,
              status, primary_assignee_id, assigned_by, assigned_at,
              total_labor_amount, total_parts_amount, total_amount,
              is_warranty, urgency, notes,
              ready_at, delivered_at, closed_at
            )
            VALUES
              -- created (2)
              (
                3, 'WO-2026-0003', 1, 2, 3, 3, 'ТО-60',
                'created', NULL, NULL, NULL,
                6000.00, 8500.00, 14500.00,
                false, 'normal', 'Черновик сметы ТО',
                NULL, NULL, NULL
              ),
              (
                4, 'WO-2026-0004', 2, 3, 4, 4, 'Диагностика ДВС',
                'created', NULL, NULL, NULL,
                3500.00, 0.00, 3500.00,
                false, 'high', NULL,
                NULL, NULL, NULL
              ),
              -- assigned (2): #2 + #5
              (
                2, 'WO-2026-0002', 1, 1, 1, 1, 'Окраска',
                'assigned', 5, 2, now() - interval '20 hours',
                15000.00, 5000.00, 20000.00,
                false, 'normal', NULL,
                NULL, NULL, NULL
              ),
              (
                5, 'WO-2026-0005', 1, 7, 2, 2, 'Стойки стабилизатора',
                'assigned', 4, 2, now() - interval '2 days',
                4000.00, 8000.00, 12000.00,
                false, 'normal', NULL,
                NULL, NULL, NULL
              ),
              -- waiting_parts (2)
              (
                6, 'WO-2026-0006', 1, 4, 5, 6, 'Кондиционер',
                'waiting_parts', 4, 2, now() - interval '9 days',
                7000.00, 11000.00, 18000.00,
                false, 'normal', 'Ждём осушитель',
                NULL, NULL, NULL
              ),
              (
                7, 'WO-2026-0007', 2, 5, 4, 5, 'Сцепление',
                'waiting_parts', 6, 3, now() - interval '12 days',
                18000.00, 34000.00, 52000.00,
                false, 'high', 'Комплект сцепления в пути',
                NULL, NULL, NULL
              ),
              -- in_progress (2): #1 + #8
              (
                1, 'WO-2026-0001', 1, 1, 1, 1, 'Подвеска',
                'in_progress', 4, 2, now() - interval '20 hours',
                8000.00, 12000.00, 20000.00,
                false, 'normal', NULL,
                NULL, NULL, NULL
              ),
              (
                8, 'WO-2026-0008', 2, 3, 4, 4, 'Катушки / свечи',
                'in_progress', 6, 3, now() - interval '5 days',
                9000.00, 16000.00, 25000.00,
                false, 'normal', NULL,
                NULL, NULL, NULL
              ),
              -- work_completed (2)
              (
                9, 'WO-2026-0009', 1, 2, 3, 3, 'Передние колодки',
                'work_completed', 5, 2, now() - interval '3 days',
                3500.00, 6500.00, 10000.00,
                false, 'normal', NULL,
                NULL, NULL, NULL
              ),
              (
                10, 'WO-2026-0010', 1, 6, 1, 7, 'Шиномонтаж',
                'work_completed', 4, 2, now() - interval '18 days',
                4000.00, 0.00, 4000.00,
                false, 'normal', NULL,
                NULL, NULL, NULL
              ),
              -- ready_for_pickup (2)
              (
                11, 'WO-2026-0011', 1, 4, 5, 6, 'Заправка фреона',
                'ready_for_pickup', 4, 2, now() - interval '8 days',
                5000.00, 3000.00, 8000.00,
                false, 'normal', NULL,
                now() - interval '1 day', NULL, NULL
              ),
              (
                12, 'WO-2026-0012', 2, 5, 4, 5, 'Замена масла АКПП',
                'ready_for_pickup', 6, 3, now() - interval '6 days',
                6000.00, 9000.00, 15000.00,
                false, 'normal', NULL,
                now() - interval '12 hours', NULL, NULL
              ),
              -- delivered (2)
              (
                13, 'WO-2026-0013', 1, 6, 1, 7, 'Сход-развал',
                'delivered', 4, 2, now() - interval '17 days',
                5000.00, 0.00, 5000.00,
                false, 'normal', 'Частичная оплата',
                now() - interval '16 days', now() - interval '15 days', NULL
              ),
              (
                14, 'WO-2026-0014', 2, 3, 4, 4, 'Промывка инжектора',
                'delivered', 6, 3, now() - interval '4 days',
                4500.00, 2500.00, 7000.00,
                false, 'normal', NULL,
                now() - interval '3 days', now() - interval '2 days', NULL
              ),
              -- closed (3)
              (
                15, 'WO-2026-0015', 1, 2, 3, 3, 'Замена фильтров',
                'closed', 5, 2, now() - interval '25 days',
                3000.00, 4500.00, 7500.00,
                false, 'normal', NULL,
                now() - interval '24 days', now() - interval '23 days',
                now() - interval '23 days'
              ),
              (
                16, 'WO-2026-0016', 2, 5, 4, 5, 'Тормозные диски',
                'closed', 6, 3, now() - interval '30 days',
                8000.00, 14000.00, 22000.00,
                false, 'normal', NULL,
                now() - interval '28 days', now() - interval '27 days',
                now() - interval '27 days'
              ),
              (
                17, 'WO-2026-0017', 1, 1, 1, 1, 'Гарантия: подтяжка',
                'closed', 4, 2, now() - interval '40 days',
                0.00, 0.00, 0.00,
                true, 'normal', 'Гарантийный визит',
                now() - interval '39 days', now() - interval '39 days',
                now() - interval '39 days'
              ),
              -- cancelled (2)
              (
                18, 'WO-2026-0018', 1, 7, 2, 2, 'Полировка кузова',
                'cancelled', NULL, 2, NULL,
                12000.00, 2000.00, 14000.00,
                false, 'normal', 'Клиент отказался — дорого',
                NULL, NULL, NULL
              ),
              (
                19, 'WO-2026-0019', 2, 3, 4, 4, 'Чип-тюнинг',
                'cancelled', 6, 3, now() - interval '6 days',
                25000.00, 0.00, 25000.00,
                false, 'normal', 'Уехал к дилеру',
                NULL, NULL, NULL
              );

            INSERT INTO work_order_items (
              id, work_order_id, title, description, item_type,
              qty, unit_price, amount, assignee_id, status, sort_order
            )
            VALUES
              (1, 1, 'Замена рычага', NULL, 'labor', 1, 8000.00, 8000.00, 4, 'in_progress', 1),
              (2, 1, 'Рычаг в сборе', NULL, 'part', 1, 12000.00, 12000.00, 4, 'done', 2),
              (3, 2, 'Локальная окраска крыла', NULL, 'labor', 1, 15000.00, 15000.00, 5, 'assigned', 1),
              (4, 2, 'Краска / материалы', NULL, 'part', 1, 5000.00, 5000.00, 5, 'waiting_parts', 2),
              (5, 3, 'ТО-60 работы', NULL, 'labor', 1, 6000.00, 6000.00, NULL, 'pending', 1),
              (6, 3, 'Масло + фильтры', NULL, 'part', 1, 8500.00, 8500.00, NULL, 'pending', 2),
              (7, 4, 'Компьютерная диагностика', NULL, 'labor', 1, 3500.00, 3500.00, NULL, 'pending', 1),
              (8, 5, 'Замена стоек стабилизатора', NULL, 'labor', 1, 4000.00, 4000.00, 4, 'assigned', 1),
              (9, 5, 'Стойки (к-т)', NULL, 'part', 1, 8000.00, 8000.00, 4, 'assigned', 2),
              (10, 6, 'Работа по кондиционеру', NULL, 'labor', 1, 7000.00, 7000.00, 4, 'waiting_parts', 1),
              (11, 6, 'Осушитель + фреон', NULL, 'part', 1, 11000.00, 11000.00, 4, 'waiting_parts', 2),
              (12, 7, 'Замена сцепления', NULL, 'labor', 1, 18000.00, 18000.00, 6, 'waiting_parts', 1),
              (13, 7, 'Комплект сцепления', NULL, 'part', 1, 34000.00, 34000.00, 6, 'waiting_parts', 2),
              (14, 8, 'Замена катушек/свечей', NULL, 'labor', 1, 9000.00, 9000.00, 6, 'in_progress', 1),
              (15, 8, 'Катушки + свечи', NULL, 'part', 1, 16000.00, 16000.00, 6, 'done', 2),
              (16, 9, 'Замена колодок', NULL, 'labor', 1, 3500.00, 3500.00, 5, 'done', 1),
              (17, 9, 'Колодки передние', NULL, 'part', 1, 6500.00, 6500.00, 5, 'done', 2),
              (18, 10, 'Шиномонтаж 4 кол.', NULL, 'labor', 1, 4000.00, 4000.00, 4, 'done', 1),
              (19, 11, 'Заправка фреона', NULL, 'labor', 1, 5000.00, 5000.00, 4, 'done', 1),
              (20, 11, 'Фреон', NULL, 'part', 1, 3000.00, 3000.00, 4, 'done', 2),
              (21, 12, 'Замена масла АКПП', NULL, 'labor', 1, 6000.00, 6000.00, 6, 'done', 1),
              (22, 12, 'Масло АКПП', NULL, 'part', 1, 9000.00, 9000.00, 6, 'done', 2),
              (23, 13, 'Сход-развал', NULL, 'labor', 1, 5000.00, 5000.00, 4, 'done', 1),
              (24, 14, 'Промывка инжектора', NULL, 'labor', 1, 4500.00, 4500.00, 6, 'done', 1),
              (25, 14, 'Жидкость промывки', NULL, 'part', 1, 2500.00, 2500.00, 6, 'done', 2),
              (26, 15, 'Замена фильтров', NULL, 'labor', 1, 3000.00, 3000.00, 5, 'done', 1),
              (27, 15, 'Фильтры (к-т)', NULL, 'part', 1, 4500.00, 4500.00, 5, 'done', 2),
              (28, 16, 'Замена дисков', NULL, 'labor', 1, 8000.00, 8000.00, 6, 'done', 1),
              (29, 16, 'Диски тормозные', NULL, 'part', 1, 14000.00, 14000.00, 6, 'done', 2),
              (30, 18, 'Полировка', NULL, 'labor', 1, 12000.00, 12000.00, NULL, 'pending', 1),
              (31, 18, 'Паста', NULL, 'part', 1, 2000.00, 2000.00, NULL, 'pending', 2),
              (32, 19, 'Чип-тюнинг', NULL, 'labor', 1, 25000.00, 25000.00, 6, 'assigned', 1);

            INSERT INTO work_order_status_history (
              work_order_id, from_status, to_status, changed_by, note, changed_at
            )
            VALUES
              (1, NULL, 'created', 2, 'Created', now() - interval '22 hours'),
              (1, 'created', 'assigned', 2, 'Assigned to Sergey', now() - interval '20 hours'),
              (1, 'assigned', 'in_progress', 2, NULL, now() - interval '18 hours'),
              (2, NULL, 'created', 2, 'Created', now() - interval '22 hours'),
              (2, 'created', 'assigned', 2, 'Assigned to Dmitry', now() - interval '20 hours'),
              (3, NULL, 'created', 2, 'Created', now() - interval '3 days'),
              (6, NULL, 'created', 2, 'Created', now() - interval '10 days'),
              (6, 'created', 'assigned', 2, NULL, now() - interval '9 days'),
              (6, 'assigned', 'waiting_parts', 2, 'Wait dryer', now() - interval '8 days'),
              (11, NULL, 'created', 2, 'Created', now() - interval '9 days'),
              (11, 'created', 'assigned', 2, NULL, now() - interval '8 days'),
              (11, 'assigned', 'in_progress', 2, NULL, now() - interval '7 days'),
              (11, 'in_progress', 'work_completed', 2, NULL, now() - interval '2 days'),
              (11, 'work_completed', 'ready_for_pickup', 2, NULL, now() - interval '1 day'),
              (15, NULL, 'created', 2, 'Created', now() - interval '26 days'),
              (15, 'created', 'assigned', 2, NULL, now() - interval '25 days'),
              (15, 'assigned', 'in_progress', 2, NULL, now() - interval '25 days'),
              (15, 'in_progress', 'work_completed', 2, NULL, now() - interval '24 days'),
              (15, 'work_completed', 'ready_for_pickup', 2, NULL, now() - interval '24 days'),
              (15, 'ready_for_pickup', 'delivered', 2, NULL, now() - interval '23 days'),
              (15, 'delivered', 'closed', 2, 'Paid', now() - interval '23 days'),
              (18, NULL, 'created', 2, 'Created', now() - interval '5 days'),
              (18, 'created', 'cancelled', 2, 'Client refused', now() - interval '4 days');

            INSERT INTO payments (
              work_order_id, branch_id, amount, method, paid_at, created_by, comment
            )
            VALUES
              (1, 1, 10000.00, 'card', now() - interval '10 hours', 2, 'Предоплата'),
              (13, 1, 2500.00, 'cash', now() - interval '15 days', 2, 'Частичная оплата'),
              (14, 2, 7000.00, 'transfer', now() - interval '2 days', 3, 'Полная оплата, ЗН ещё не closed'),
              (15, 1, 7500.00, 'card', now() - interval '23 days', 2, NULL),
              (16, 2, 22000.00, 'transfer', now() - interval '27 days', 3, NULL);

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
              ),
              (
                1, 5, 6, 11, 2, 'pickup',
                'Клиент заберёт авто (фреон)', now() + interval '6 hours', 'open', 2
              ),
              (
                1, 3, 3, 15, 2, 'remind_service',
                'Напомнить ТО через 6 мес.', now() + interval '180 days', 'open', 2
              );
            """
        )
    )

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
    # Полная очистка операционных данных сида (+ хвостов на демо-филиалах),
    # иначе FK (tasks.created_by, users.branch_id и т.п.) ломают downgrade.
    op.execute(
        sa.text(
            """
            DELETE FROM tasks;
            DELETE FROM payments;
            DELETE FROM work_order_status_history;
            DELETE FROM work_order_items;
            DELETE FROM work_orders;
            DELETE FROM visits;
            DELETE FROM appointments;
            DELETE FROM touches;
            DELETE FROM vehicles;
            DELETE FROM clients;
            DELETE FROM users;
            DELETE FROM branches;
            """
        )
    )
