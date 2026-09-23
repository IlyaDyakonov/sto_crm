# STO CRM — CRM для сети автомастерских

Рабочий прототип CRM для сети СТО: от клиента и автомобиля до заказ-наряда, денег и ролей команды.  
Подробнее о продукте: [`BUSINESS.md`](BUSINESS.md) · архитектура: [`ARCHITECTURE.md`](ARCHITECTURE.md)

### Развитие (идеи на следующий этап)

**Backend**

1. **Redis** — кэш для сети с большим числом филиалов: дашборд, справочники, сотрудники, списки ЗН; инвалидация по событию (смена статуса ЗН / филиал), а не «кэш навсегда».
2. **Агрегации выручки в SQL** — чеки, факт/pipeline/просрочка по филиалу и периоду на бэкенде (единый источник правды, меньше трафика, чем считать KPI на фронте из полного списка ЗН).
3. **SSE или WebSocket** — live-обновления карточки ЗН, очереди нарядов, дашборда; канал по филиалу / по конкретному ЗН.
4. **Docker** — отдельные контейнеры: backend, frontend, realtime-сервис, PostgreSQL, Redis, **Portainer**, **Traefik** (маршрутизация / TLS).
5. **CI/CD** — GitHub Actions: lint/tests → образ → деплой.
6. **Настоящий auth** — вместо `X-User-Id`: JWT (или session) + refresh, пароли/SSO; роли как сейчас, но с сессией и аудитом входа.

Дополнительно по бэку: фоновые задачи (напоминания ТО, PDF-отчёты), наблюдаемость (логи/метрики/ошибки), автотесты API под ACL и state-machine статусов.

**Frontend**

1. **Разгрузить главный дашборд** — метрики/таблицы отдельно от операционки (мои ЗН, задачи); меньше «всё на одном экране».
2. **Периоды и отчёты** — фильтр день / неделя / месяц / произвольные даты; выгрузка в PDF для руководства.
3. **SSE / WebSocket на UI** — подписка на события ЗН и дашборда без ручного refresh.

Дополнительно по фронту: экраны воронки (записи/визиты) и кассы (API уже есть), мобильный сценарий для рабочего на посту.

---

## Зачем это

У сети СТО обычно разъезжаются три мира: **кто приехал**, **кто чинит** и **сколько заплатили**. Абстрактный sales-CRM тут не помогает.

**STO CRM** держит ось правды на **заказ-наряде (ЗН)**: работы, статусы, исполнитель и выручка считаются от наряда, а не от «лида». Клиент и авто — сквозная история по сети; ЗН всегда привязан к филиалу.

---

## Что можно делать в прототипе

| Область | Возможности |
|--------|-------------|
| **Дашборд** | KPI для руководства: выручка (факт, только работы), средний чек, сумма «в работе», просроченные ЗН; выручка по филиалам |
| **Заказ-наряды** | Создать / править ЗН, позиции (работы и запчасти), назначение мастера, смена статуса по правилам |
| **Клиенты / авто** | Создать клиента и авто, поиск (имя/телефон; авто — ещё и по госномеру), карточка клиента → авто → история ЗН |
| **Задачи** | Перезвонить, согласовать допы, напомнить ТО, выдача, эскалация; смена статуса |
| **Роли** | Переключатель пользователя в шапке — сразу другой доступ и другой набор экранов |

Демо-данные поднимаются вместе с миграциями (филиалы, пользователи, визит с двумя ЗН на одно авто).

---

## Роли

| Роль | Что видит | Что делает |
|------|-----------|------------|
| **Директор** | Вся сеть | Финансы сети, все ЗН, филиалы и сотрудники, клиенты сети |
| **Руководитель филиала** | Свой филиал | CRUD ЗН своего СТО, назначение рабочих, финансы филиала, клиенты, задачи |
| **Рабочий** | Свои наряды и задачи | Меняет статусы своих задач; **без** финансов и без раздела «Клиенты» |

---

## Статусы заказ-наряда

```
created → assigned → in_progress → work_completed → ready_for_pickup → delivered → closed
                ↘ waiting_parts ↗                                    ↘ cancelled
```

Кратко: создан → назначен → в работе (или ждём запчасть) → работы готовы → к выдаче → выдан → **закрыт (деньги получены)** / отменён.

**Задачи:** `open` → `in_progress` → `done` / `cancelled`.

Выручка «факт» на дашборде — сумма работ (`total_labor_amount`) по ЗН в статусе `closed`. Просрочка — ЗН в работе / ожидании запчасти дольше 7 дней.

---

## Стек (кратко)

Backend: FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL · auth прототипа: заголовок **`X-User-Id`** (без JWT).  
Frontend: Vite + React + TypeScript · proxy `/api` → backend.

---

# Как запустить

## Требования

- Python 3.11+
- Node.js 18+ (лучше 20+)
- Локальный PostgreSQL 14+ (без Docker)

---

## 1. Локальная PostgreSQL

### 1.1. Узнать порт

По умолчанию часто `5432`. На Windows после установки PostgreSQL иногда `5433`.

```powershell
# вариант A — из конфига (подставьте свою версию)
Select-String -Path "C:\Program Files\PostgreSQL\18\data\postgresql.conf" -Pattern "^port\s*="

# вариант B — если уже можете подключиться
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -p 5433 -c "SHOW port;"
```

Ниже в примерах порт **`5433`**. Если у вас `5432` — замените везде.

### 1.2. Создать пользователя и БД

Ошибка `пользователь "sto" не прошёл проверку подлинности` значит: роли `sto` ещё нет **или** у неё другой пароль. Сначала один раз подготовьте БД.

**Скрипт** из папки `backend`:

```powershell
cd backend
.\scripts\setup_db.ps1 -PgPort 5433
```

Скрипт спросит пароль суперпользователя `postgres`, создаст/сбросит роль `sto` с паролем `sto` и БД `sto_crm`.

Проверка входа под `sto`:

```powershell
$env:PGPASSWORD = "sto"
& "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U sto -h 127.0.0.1 -p 5433 -d sto_crm -c "SELECT current_database(), current_user;"
```

### 1.3. Прописать `DATABASE_URL`

Файл `backend/.env` (используйте **127.0.0.1**, не `localhost` — иначе Windows может ходить на IPv6 `::1`):

```env
DATABASE_URL=postgresql+psycopg://sto:sto@127.0.0.1:5433/sto_crm
APP_NAME=STO CRM API
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Если порт `5432`:

```env
DATABASE_URL=postgresql+psycopg://sto:sto@127.0.0.1:5432/sto_crm
```

---

## 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

`alembic upgrade head` делает сразу:

1. `001_initial` — схема таблиц  
2. `002_seed_demo` — демо-данные (филиалы, роли, визит с двумя ЗН)

Linux/macOS (после создания БД через `psql`):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# поправьте DATABASE_URL в .env под свой порт
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000  
- Swagger: http://localhost:8000/docs  

Сброс схемы и данных (удалит всё в `sto_crm`):

```powershell
cd backend
alembic downgrade base
alembic upgrade head
```

---

## 3. Демо-пользователи

В UI переключаются в шапке. В Swagger — через **Authorize** → `X-User-Id`.

| X-User-Id | Email | Роль |
|-----------|--------|------|
| 1 | director@sto.local | director (вся сеть) |
| 2 | manager.lenina@sto.local | branch_manager (СТО Ленина) |
| 3 | manager.south@sto.local | branch_manager (СТО Юг) |
| 4 | worker.suspension@sto.local | worker |
| 5 | worker.paint@sto.local | worker |
| 6 | worker.south@sto.local | worker |

---

## 4. Как протестировать (Swagger)

1. Запустите API и откройте http://localhost:8000/docs  
2. **Authorize** → `X-User-Id` (например `2`) → **Authorize** → **Close**  
3. **Try it out** — заголовок подставится сам  

Удобно проверить:

- `GET /api/me` — текущий пользователь  
- `GET /api/work-orders` — у руководителя (`2`) есть суммы; у рабочего (`4`) финансов в ответе нет  
- `GET /api/visits/1/work-orders` — два ЗН на один визит  
- `POST /api/work-orders/{id}/assign` и `/status` — назначение и смена статуса  
- `GET /api/payments` — у рабочего (`4`) будет **403**  

Смена роли: снова **Authorize** и другой `X-User-Id`.

---

## 5. Frontend

```powershell
cd frontend
npm install
npm run dev
```

- UI: http://localhost:5173  
- В dev Vite проксирует `/api` → backend `:8000`  
- Подробнее по фронту: [`frontend/README.md`](frontend/README.md)

---

## Вне scope этого MVP

JWT/полноценный auth, склад, прайс-лист, фото приёмки, каналы лидов и ROI, нормочасы мастера.  
Серверных дашборд-агрегаций нет — KPI считаются на фронте из списка ЗН (с учётом ACL).
