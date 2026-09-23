import { DEMO_USERS, useUser } from '../context/UserContext'
import { roleBadgeClass, roleLabel } from '../lib/roles'

export function Header() {
  const { userId, setUserId, me, meLoading, meError } = useUser()

  return (
    <header className="app-header">
      <div className="app-brand">
        <span className="app-brand__mark" aria-hidden>
          STO
        </span>
        <div>
          <div className="app-brand__title">STO CRM</div>
          <div className="app-brand__sub">Демо ролей и заказ-нарядов</div>
        </div>
      </div>

      <div className="app-header__controls">
        <div className="app-header__user">
          {meLoading && <span className="muted">Загрузка профиля…</span>}
          {meError && (
            <span className="alert alert--error" role="alert">
              {meError}
            </span>
          )}
          {!meLoading && !meError && me && (
            <>
              <span className="app-header__user-name">{me.full_name}</span>
              <span className={roleBadgeClass(me.role)}>{roleLabel(me.role)}</span>
              <span className="app-header__user-meta">
                {me.branch_id != null ? `филиал #${me.branch_id}` : 'вся сеть'}
              </span>
            </>
          )}
        </div>

        <div className="app-header__role-switch">
          <label htmlFor="demo-user-id">Роль</label>
          <select
            id="demo-user-id"
            value={userId}
            onChange={(e) => setUserId(Number(e.target.value))}
            title="X-User-Id для API"
          >
            {DEMO_USERS.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  )
}
