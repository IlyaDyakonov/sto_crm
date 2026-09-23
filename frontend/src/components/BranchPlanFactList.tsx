import { useState, type FormEvent } from 'react'
import { createBranch } from '../api/endpoints'
import { formatApiError } from '../api/errors'
import type { Branch, WorkOrder } from '../api/types'
import { useUser } from '../context/UserContext'
import { buildBranchFacts, REVENUE_WORK_ORDER_STATUSES } from '../lib/revenue'
import { formatMoney } from '../lib/roles'

type Props = {
  branches: Branch[]
  workOrders: WorkOrder[]
  emptyText?: string
  /** Директор может добавлять филиалы */
  canCreate?: boolean
  onCreated?: () => void
}

export function BranchPlanFactList({
  branches,
  workOrders,
  emptyText = 'Нет филиалов',
  canCreate = false,
  onCreated,
}: Props) {
  const { userId } = useUser()
  const rows = buildBranchFacts(branches, workOrders)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!canCreate) return
    setBusy(true)
    setError(null)
    try {
      await createBranch(userId, {
        name: name.trim(),
        address: address.trim() || null,
      })
      setName('')
      setAddress('')
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
            <span>Название филиала</span>
            <input
              className="input"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="СТО Центр"
            />
          </label>
          <label className="field">
            <span>Адрес</span>
            <input
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="ул. Примерная, 1"
            />
          </label>
          <div className="field">
            <span>&nbsp;</span>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? 'Добавление…' : 'Добавить филиал'}
            </button>
          </div>
        </form>
      )}

      {!rows.length ? (
        <p className="empty-hint">{emptyText}</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Филиал</th>
                <th className="num">Факт</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ branch, fact }) => (
                <tr key={branch.id}>
                  <td>
                    <strong>{branch.name}</strong>
                    <div className="muted">
                      {branch.address ?? `филиал #${branch.id}`}
                    </div>
                  </td>
                  <td className="num">
                    <strong>{formatMoney(fact)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted table-footnote">
            Факт: сумма ЗН со статусом {REVENUE_WORK_ORDER_STATUSES.join(' / ')}{' '}
            (закрыт = деньги получены)
          </p>
        </div>
      )}
    </div>
  )
}
