import { useCallback } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getClient, listVehicles } from '../api/endpoints'
import type { Vehicle } from '../api/types'
import { StatusBlock } from '../components/StatusBlock'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'
import { isWorker } from '../lib/roles'

export function ClientDetailPage() {
  const { clientId: clientIdParam } = useParams()
  const clientId = Number(clientIdParam)
  const { me, meLoading } = useUser()

  const clientFetcher = useCallback(
    (uid: number) => getClient(uid, clientId),
    [clientId],
  )
  const client = useApiResource(clientFetcher, [clientId])

  const vehiclesFetcher = useCallback(
    (uid: number) => listVehicles(uid, { client_id: clientId }),
    [clientId],
  )
  const vehicles = useApiResource(vehiclesFetcher, [clientId])

  if (!Number.isFinite(clientId) || clientId <= 0) {
    return <Navigate to="/clients" replace />
  }

  if (!meLoading && isWorker(me?.role)) {
    return <Navigate to="/" replace />
  }

  const loading = meLoading || client.loading || vehicles.loading
  const error = client.error || vehicles.error

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__title-block">
          <Link className="page__back" to="/clients">
            ← Клиенты
          </Link>
          <h1>{client.data?.name ?? `Клиент #${clientId}`}</h1>
          <p className="page__lead">Автомобили клиента и переход к истории ЗН.</p>
        </div>
      </header>

      <StatusBlock loading={loading} error={error}>
        <div className="stack">
          {client.data && (
            <div className="card">
              <dl className="meta-grid">
                <div>
                  <dt>ID</dt>
                  <dd className="mono">{client.data.id}</dd>
                </div>
                <div>
                  <dt>Телефон</dt>
                  <dd className="mono">{client.data.phone}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{client.data.email ?? '—'}</dd>
                </div>
                <div>
                  <dt>Тип</dt>
                  <dd>
                    <span className="badge badge--neutral">
                      {client.data.client_type}
                    </span>
                  </dd>
                </div>
                {client.data.notes ? (
                  <div>
                    <dt>Заметки</dt>
                    <dd>{client.data.notes}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          )}

          <div className="card card--flush">
            <div className="card__header">
              <h2 className="card__title">Автомобили</h2>
            </div>
            <StatusBlock
              loading={false}
              error={null}
              empty={!vehicles.data?.length}
              emptyText="У клиента нет автомобилей"
            >
              <VehicleTable
                items={vehicles.data ?? []}
                clientId={clientId}
              />
            </StatusBlock>
          </div>
        </div>
      </StatusBlock>
    </section>
  )
}

function VehicleTable({
  items,
  clientId,
}: {
  items: Vehicle[]
  clientId: number
}) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Госномер</th>
            <th>Марка / модель</th>
            <th>Год</th>
            <th>VIN</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((v) => (
            <tr key={v.id}>
              <td className="mono">
                <strong>{v.plate_number}</strong>
              </td>
              <td>
                {v.make} {v.model}
              </td>
              <td>{v.year ?? '—'}</td>
              <td className="mono">{v.vin ?? '—'}</td>
              <td>
                <Link
                  className="row-link"
                  to={`/clients/${clientId}/vehicles/${v.id}`}
                >
                  Открыть
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
