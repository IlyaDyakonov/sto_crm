# STO CRM — Frontend

React (Vite) + TypeScript. UI под `backend/` API.

## Требования

- Node.js 18+ (рекомендуется 20+)
- Backend на http://localhost:8000 (см. корневой README)

## Запуск

```powershell
cd frontend
npm install
npm run dev
```

Откроется http://localhost:5173.

В dev Vite проксирует `/api` → `http://localhost:8000` (см. `vite.config.ts`).  
CORS на бэке тоже разрешён для 5173 — можно вместо proxy задать `VITE_API_URL=http://localhost:8000`.

Сборка:

```powershell
npm run build
npm run preview
```

## Auth прототипа

Все запросы идут с заголовком **`X-User-Id`**.

В шапке — переключатель демо-пользователей (1–6). При смене id:

1. вызывается `GET /api/me`
2. страницы перезапрашивают свои списки под новым user id

## Экраны

| Маршрут | Данные |
|---------|--------|
| `/` | Краткие списки ЗН и задач |
| `/work-orders` | Список ЗН |
| `/work-orders/:id` | Карточка: статус, назначение (manager/director), суммы скрыты у worker |
| `/clients` | Клиенты + авто, поиск `GET /api/vehicles?plate=` |
| `/tasks` | Список задач |

Смена роли в шапке → `/api/me` + рефетч списков.
