# STO CRM — сеть автомастерских

Продукт: `BUSINESS.md` · Архитектура: `ARCHITECTURE.md` · Backend MVP: `backend/` · Frontend: `frontend/`

## Что есть

- FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL
- Модели по `ARCHITECTURE.md` §7 (без дашборд-агрегаций)
- Auth прототипа: заголовок **`X-User-Id`** (без JWT)
- Пересчёт сумм ЗН из items, ACL по ролям, state-machine статусов ЗН
- Демо-данные поднимаются **миграцией** `002_seed_demo` (вместе с `alembic upgrade head`)
- Frontend (Vite + React + TS): дашборд, ЗН, клиенты, задачи; `X-User-Id` + Vite proxy `/api`

## Требования

- Python 3.11+
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
cd D:\Python\Проекты\find_work\testovoe-fintech\backend
.\scripts\setup_db.ps1 -PgPort 5433
```

Скрипт спросит пароль суперпользователя `postgres` (тот, что задавали при установке PostgreSQL), создаст/сбросит роль `sto` с паролем `sto` и БД `sto_crm`.


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

Из корня репозитория:

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
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
# поправьте DATABASE_URL в .env под свой порт
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

- API: http://localhost:8000  
- Swagger: http://localhost:8000/docs  

Сброс схемы и данных (осторожно — удалит всё в `sto_crm`):

```powershell
cd backend
alembic downgrade base
alembic upgrade head
```

---

## 3. Демо-пользователи

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

1. Запустите API (`uvicorn ...`) и откройте http://localhost:8000/docs  
2. Нажмите **Authorize**, в поле `X-User-Id` введите id роли (например `2`) → **Authorize** → **Close**  
3. Вызывайте любые эндпоинты через **Try it out** — заголовок подставится сам  

Что удобно проверить:

- `GET /api/me` — текущий пользователь  
- `GET /api/work-orders` — у руководителя (`2`) есть суммы; у рабочего (`4`) финансов в ответе нет  
- `GET /api/visits/1/work-orders` — два ЗН на один визит  
- `POST /api/work-orders/{id}/assign` и `/status` — назначение и смена статуса  
- `GET /api/payments` — у рабочего (`4`) будет **403**  

Смена роли: снова **Authorize** и другой `X-User-Id`.

---

## Структура backend

```text
backend/
  app/
    main.py
    config.py
    database.py
    deps.py              # X-User-Id (+ Authorize в Swagger)
    enums.py
    models/
    schemas/
    api/router.py
    services/
  alembic/
    versions/
      001_initial.py     # схема
      002_seed_demo.py   # демо-данные
  scripts/
    setup_db.ps1
    create_db.sql
  requirements.txt
  .env.example
```

---

## 5. Frontend

```powershell
cd frontend
npm install
npm run dev
```

- UI: http://localhost:5173  
- В dev Vite проксирует `/api` → backend `:8000`  
- Подробнее: `frontend/README.md`

---

## Вне scope MVP

JWT, склад, прайс, фото, дашборд-агрегации; на фронте — без дизайна (сырые таблицы).
