import { useCallback, useState, type FormEvent } from 'react'
import { listClients, listVehicles } from '../api/endpoints'
import type { Client, Vehicle } from '../api/types'
import { StatusBlock } from '../components/StatusBlock'
import { useApiResource } from '../hooks/useApiResource'

export function ClientsPage() {
  const [plateInput, setPlateInput] = useState('')
  const [plateQuery, setPlateQuery] = useState('')

  const clientsFetcher = useCallback((uid: number) => listClients(uid), [])
  const clients = useApiResource(clientsFetcher)

  const vehiclesFetcher = useCallback(
    (uid: number) =>
      listVehicles(uid, plateQuery ? { plate: plateQuery } : undefined),
    [plateQuery],
  )
  const vehicles = useApiResource(vehiclesFetcher, [plateQuery])

  function onSearch(e: FormEvent) {
    e.preventDefault()
    setPlateQuery(plateInput.trim())
  }

  function onClear() {
    setPlateInput('')
    setPlateQuery('')
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
