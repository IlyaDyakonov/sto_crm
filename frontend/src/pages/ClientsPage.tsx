import { useCallback, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import {
  createClient,
  createVehicle,
  listClients,
  listVehicles,
} from '../api/endpoints'
import { formatApiError } from '../api/errors'
import type { Client, Vehicle } from '../api/types'
import { StatusBlock } from '../components/StatusBlock'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'
import { canSeeFinance, isWorker } from '../lib/roles'

export function ClientsPage() {
  const { userId, me, meLoading } = useUser()
  const [plateInput, setPlateInput] = useState('')
  const [plateQuery, setPlateQuery] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientType, setClientType] = useState('person')

  const [vehClientId, setVehClientId] = useState<number | ''>('')
  const [vehPlate, setVehPlate] = useState('')
  const [vehMake, setVehMake] = useState('')
  const [vehModel, setVehModel] = useState('')
  const [vehYear, setVehYear] = useState('')
  const [vehVin, setVehVin] = useState('')

  const clientsFetcher = useCallback((uid: number) => listClients(uid), [])
  const clients = useApiResource(clientsFetcher)

  const vehiclesFetcher = useCallback(
    (uid: number) =>
      listVehicles(uid, plateQuery ? { plate: plateQuery } : undefined),
    [plateQuery],
  )
  const vehicles = useApiResource(vehiclesFetcher, [plateQuery])

  if (!meLoading && isWorker(me?.role)) {
    return <Navigate to="/" replace />
  }

  const canManage = canSeeFinance(me?.role)

  function onSearch(e: FormEvent) {
    e.preventDefault()
    setPlateQuery(plateInput.trim())
  }

  function onClear() {
    setPlateInput('')
    setPlateQuery('')
  }

  async function onCreateClient(e: FormEvent) {
    e.preventDefault()
    if (!canManage) return
    setBusy(true)
    setFormError(null)
    try {
      await createClient(userId, {
        name: clientName.trim(),
        phone: clientPhone.trim(),
        email: clientEmail.trim() || null,
        client_type: clientType,
      })
      setClientName('')
      setClientPhone('')
      setClientEmail('')
      setClientType('person')
      clients.reload()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  async function onCreateVehicle(e: FormEvent) {
    e.preventDefault()
    if (!canManage || vehClientId === '') return
    setBusy(true)
    setFormError(null)
    try {
      await createVehicle(userId, {
        client_id: Number(vehClientId),
        plate_number: vehPlate.trim(),
        make: vehMake.trim(),
        model: vehModel.trim(),
        year: vehYear.trim() ? Number(vehYear) : null,
        vin: vehVin.trim() || null,
      })
      setVehPlate('')
      setVehMake('')
      setVehModel('')
      setVehYear('')
      setVehVin('')
      vehicles.reload()
    } catch (err) {
      setFormError(formatApiError(err))
    } finally {
      setBusy(false)
    }
  }

  const clientById = new Map((clients.data ?? []).map((c: Client) => [c.id, c]))

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__title-block">
          <h1>Клиенты и авто</h1>
          <p className="page__lead">Справочники и поиск авто по госномеру.</p>
        </div>
      </header>

      <div className="stack">
      {canManage && (
        <>
          {formError && (
            <p className="alert alert--error" role="alert">
              {formError}
            </p>
          )}

          <div className="card">
            <div className="section-head">
              <h2>Новый клиент</h2>
            </div>
            <form className="form-grid" onSubmit={onCreateClient}>
              <label className="field">
                <span>Имя</span>
                <input
                  className="input"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Телефон</span>
                <input
                  className="input mono"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Email</span>
                <input
                  className="input"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Тип</span>
                <select
                  className="select"
                  value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                >
                  <option value="person">person</option>
                  <option value="company">company</option>
                </select>
              </label>
              <div className="field">
                <span>&nbsp;</span>
                <button className="btn" type="submit" disabled={busy}>
                  Добавить клиента
                </button>
              </div>
            </form>
          </div>

          <div className="card">
            <div className="section-head">
              <h2>Новое авто</h2>
            </div>
            <form className="form-grid" onSubmit={onCreateVehicle}>
              <label className="field">
                <span>Клиент</span>
                <select
                  className="select"
                  required
                  value={vehClientId === '' ? '' : String(vehClientId)}
                  onChange={(e) =>
                    setVehClientId(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                >
                  <option value="">— выбрать —</option>
                  {(clients.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (#{c.id})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Госномер</span>
                <input
                  className="input mono"
                  required
                  value={vehPlate}
                  onChange={(e) => setVehPlate(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Марка</span>
                <input
                  className="input"
                  required
                  value={vehMake}
                  onChange={(e) => setVehMake(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Модель</span>
                <input
                  className="input"
                  required
                  value={vehModel}
                  onChange={(e) => setVehModel(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Год</span>
                <input
                  className="input"
                  type="number"
                  value={vehYear}
                  onChange={(e) => setVehYear(e.target.value)}
                />
              </label>
              <label className="field">
                <span>VIN</span>
                <input
                  className="input mono"
                  value={vehVin}
                  onChange={(e) => setVehVin(e.target.value)}
                />
              </label>
              <div className="field">
                <span>&nbsp;</span>
                <button className="btn" type="submit" disabled={busy}>
                  Добавить авто
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <div className="card">
        <div className="section-head">
          <h2>Поиск по госномеру</h2>
        </div>
        <form className="form-row" onSubmit={onSearch}>
          <input
            className="input input--grow mono"
            type="search"
            placeholder="А123ВС777"
            value={plateInput}
            onChange={(e) => setPlateInput(e.target.value)}
            aria-label="Госномер"
          />
          <button className="btn" type="submit">
            Найти
          </button>
          <button className="btn btn--secondary" type="button" onClick={onClear}>
            Сбросить
          </button>
        </form>
      </div>

      <div className="card card--flush">
        <div className="card__header">
          <h2 className="card__title">
            Автомобили
            {plateQuery ? (
              <span className="muted"> · «{plateQuery}»</span>
            ) : null}
          </h2>
        </div>
        <StatusBlock
          loading={vehicles.loading}
          error={vehicles.error}
          empty={!vehicles.data?.length}
          emptyText={
            plateQuery ? 'Ничего не найдено по госномеру' : 'Автомобилей нет'
          }
        >
          <VehicleTable items={vehicles.data ?? []} clientById={clientById} />
        </StatusBlock>
      </div>

      <div className="card card--flush">
        <div className="card__header">
          <h2 className="card__title">Клиенты</h2>
        </div>
        <StatusBlock
          loading={clients.loading}
          error={clients.error}
          empty={!clients.data?.length}
          emptyText="Клиентов нет"
        >
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Имя</th>
                  <th>Телефон</th>
                  <th>Email</th>
                  <th>Тип</th>
                </tr>
              </thead>
              <tbody>
                {(clients.data ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.id}</td>
                    <td>{c.name}</td>
                    <td className="mono">{c.phone}</td>
                    <td>{c.email ?? '—'}</td>
                    <td>
                      <span className="badge badge--neutral">{c.client_type}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </StatusBlock>
      </div>
      </div>
    </section>
  )
}

function VehicleTable({
  items,
  clientById,
}: {
  items: Vehicle[]
  clientById: Map<number, Client>
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Госномер</th>
            <th>Марка / модель</th>
            <th>Год</th>
            <th>Клиент</th>
            <th>VIN</th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => {
            const client = clientById.get(v.client_id)
            return (
              <tr key={v.id}>
                <td className="mono">
                  <strong>{v.plate_number}</strong>
                </td>
                <td>
                  {v.make} {v.model}
                </td>
                <td>{v.year ?? '—'}</td>
                <td>
                  {client ? (
                    <>
                      {client.name}{' '}
                      <span className="muted">#{client.id}</span>
                    </>
                  ) : (
                    `#${v.client_id}`
                  )}
                </td>
                <td className="mono">{v.vin ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
