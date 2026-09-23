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
    <section>
      <h1>Клиенты и авто</h1>

      <h2>Поиск по госномеру</h2>
      <form onSubmit={onSearch}>
        <input
          type="search"
          placeholder="А123ВС777"
          value={plateInput}
          onChange={(e) => setPlateInput(e.target.value)}
        />{' '}
        <button type="submit">Найти</button>{' '}
        <button type="button" onClick={onClear}>
          Сбросить
        </button>
      </form>

      <h2>Автомобили{plateQuery ? ` (plate: «${plateQuery}»)` : ''}</h2>
      <StatusBlock
        loading={vehicles.loading}
        error={vehicles.error}
        empty={!vehicles.data?.length}
        emptyText={
          plateQuery ? 'Ничего не найдено по госномеру' : 'Автомобилей нет'
        }
      >
        <VehicleTable
          items={vehicles.data ?? []}
          clientById={clientById}
        />
      </StatusBlock>

      <h2>Клиенты</h2>
      <StatusBlock
        loading={clients.loading}
        error={clients.error}
        empty={!clients.data?.length}
        emptyText="Клиентов нет"
      >
        <table>
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
                <td>{c.id}</td>
                <td>{c.name}</td>
                <td>{c.phone}</td>
                <td>{c.email ?? '—'}</td>
                <td>{c.client_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </StatusBlock>
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
    <table>
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
              <td>{v.plate_number}</td>
              <td>
                {v.make} {v.model}
              </td>
              <td>{v.year ?? '—'}</td>
              <td>
                {client
                  ? `${client.name} (#${client.id})`
                  : `#${v.client_id}`}
              </td>
              <td>{v.vin ?? '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
