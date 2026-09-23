import { useMemo, useState, type FormEvent } from 'react'
import { createUser } from '../api/endpoints'
import { formatApiError } from '../api/errors'
import type { Branch, User, UserRole } from '../api/types'
import { useUser } from '../context/UserContext'
import { roleBadgeClass, roleLabel } from '../lib/roles'

type Props = {
  users: User[]
  branches: Branch[]
  canCreate?: boolean
  onCreated?: () => void
  emptyText?: string
}

const STAFF_ROLES: UserRole[] = ['branch_manager', 'worker']

export function StaffRoster({
  users,
  branches,
  canCreate = false,
  onCreated,
  emptyText = 'Нет сотрудников',
}: Props) {
  const { userId, reloadDirectory } = useUser()
  const branchName = useMemo(() => {
    const map = new Map<number, string>()
    for (const b of branches) map.set(b.id, b.name)
    return map
  }, [branches])

  const staff = users.filter(
    (u) => u.role === 'branch_manager' || u.role === 'worker',
  )

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('worker')
  const [branchId, setBranchId] = useState<number | ''>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!canCreate || branchId === '') return
    setBusy(true)
    setError(null)
    try {
      await createUser(userId, {
        full_name: fullName.trim(),
        email: email.trim(),
        role,
        branch_id: Number(branchId),
      })
      setFullName('')
      setEmail('')
      setRole('worker')
      setBranchId('')
      reloadDirectory()
      onCreated?.()
    } catch (err) {
      setError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {canCreate && (
        <form className="form-grid form-embed" onSubmit={onCreate}>
          {error && (
            <p className="alert alert--error field--wide" role="alert">
              {error}
            </p>
          )}
          <label className="field">
            <span>ФИО</span>
            <input
              className="input"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Роль</span>
            <select
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Филиал</span>
            <select
              className="select"
              required
              value={branchId === '' ? '' : String(branchId)}
              onChange={(e) =>
                setBranchId(e.target.value === '' ? '' : Number(e.target.value))
              }
            >
              <option value="">— выбрать —</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Добавление…' : 'Добавить пользователя'}
            </button>
          </div>
        </form>
      )}

      {!staff.length ? (
        <p className="empty-hint">{emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ФИО</th>
                <th>Роль</th>
                <th>Филиал</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.id}</td>
                  <td>
                    <strong>{u.full_name}</strong>
                    {!u.is_active && (
                      <span className="muted"> · неактивен</span>
                    )}
                  </td>
                  <td>
                    <span className={roleBadgeClass(u.role)}>
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td>
                    {u.branch_id != null
                      ? (branchName.get(u.branch_id) ?? `#${u.branch_id}`)
                      : '—'}
                  </td>
                  <td className="mono">{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
