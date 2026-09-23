import { DEMO_USERS, useUser } from '../context/UserContext'

export function Header() {
  const { userId, setUserId, me, meLoading, meError } = useUser()

  return (
    <header>
      <div>
        <strong>STO CRM</strong>
        {' · '}
        <label>
          Роль (X-User-Id):{' '}
          <select
            value={userId}
            onChange={(e) => setUserId(Number(e.target.value))}
          >
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        {meLoading && <span>Загрузка /api/me…</span>}
        {meError && <span>Ошибка /api/me: {meError}</span>}
        {!meLoading && !meError && me && (
          <span>
            {me.full_name} · {me.role}
            {me.branch_id != null ? ` · branch ${me.branch_id}` : ' · вся сеть'}
          </span>
        )}
      </div>
    </header>
  )
}
