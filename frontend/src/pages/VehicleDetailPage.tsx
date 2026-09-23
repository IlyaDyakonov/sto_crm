import { useCallback, useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getClient, getVehicle, listWorkOrders } from '../api/endpoints'
import { StatusBlock } from '../components/StatusBlock'
import { WorkOrderList } from '../components/WorkOrderList'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'
import { isWorker } from '../lib/roles'

export function VehicleDetailPage() {
  const { clientId: clientIdParam, vehicleId: vehicleIdParam } = useParams()
  const clientId = Number(clientIdParam)
  const vehicleId = Number(vehicleIdParam)
  const { me, meLoading } = useUser()

  const clientFetcher = useCallback(
    (uid: number) => getClient(uid, clientId),
    [clientId],
  )
  const client = useApiResource(clientFetcher, [clientId])

  const vehicleFetcher = useCallback(
    (uid: number) => getVehicle(uid, vehicleId),
    [vehicleId],
  )
  const vehicle = useApiResource(vehicleFetcher, [vehicleId])

  const workOrders = useApiResource(listWorkOrders)

  const vehicleOrders = useMemo(
    () => (workOrders.data ?? []).filter((wo) => wo.vehicle_id === vehicleId),
    [workOrders.data, vehicleId],
  )

  if (
    !Number.isFinite(clientId) ||
    clientId <= 0 ||
    !Number.isFinite(vehicleId) ||
    vehicleId <= 0
  ) {
    return <Navigate to="/clients" replace />
  }

  if (!meLoading && isWorker(me?.role)) {
    return <Navigate to="/" replace />
  }

  const mismatch =
    vehicle.data != null && vehicle.data.client_id !== clientId
      ? 'Автомобиль не принадлежит этому клиенту'
      : null

  const loading =
    meLoading || client.loading || vehicle.loading || workOrders.loading
  const error = mismatch || client.error || vehicle.error || workOrders.error

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__title-block">
          <Link className="page__back" to={`/clients/${clientId}`}>
            ← {client.data?.name ?? `Клиент #${clientId}`}
          </Link>
          <h1>
            {vehicle.data
              ? `${vehicle.data.plate_number} · ${vehicle.data.make} ${vehicle.data.model}`
              : `Авто #${vehicleId}`}
          </h1>
          <p className="page__lead">Заказ-наряды по этому автомобилю.</p>
        </div>
      </header>

      <StatusBlock loading={loading} error={error}>
        <div className="stack">
          {vehicle.data && !mismatch && (
            <div className="card">
              <dl className="meta-grid">
                <div>
                  <dt>Госномер</dt>
                  <dd className="mono">{vehicle.data.plate_number}</dd>
                </div>
                <div>
                  <dt>Марка / модель</dt>
                  <dd>
                    {vehicle.data.make} {vehicle.data.model}
                  </dd>
                </div>
                <div>
                  <dt>Год</dt>
                  <dd>{vehicle.data.year ?? '—'}</dd>
                </div>
                <div>
                  <dt>VIN</dt>
                  <dd className="mono">{vehicle.data.vin ?? '—'}</dd>
                </div>
                <div>
                  <dt>Пробег</dt>
                  <dd>
                    {vehicle.data.mileage != null
                      ? `${vehicle.data.mileage} км`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Клиент</dt>
                  <dd>
                    <Link to={`/clients/${clientId}`}>
                      {client.data?.name ?? `#${clientId}`}
                    </Link>
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {!mismatch && (
            <div className="card card--flush">
              <div className="card__header">
                <h2 className="card__title">Заказ-наряды</h2>
              </div>
              <WorkOrderList
                items={vehicleOrders}
                role={me?.role}
                emptyText="По этому авто заказ-нарядов нет"
              />
            </div>
          )}
        </div>
      </StatusBlock>
    </section>
  )
}
