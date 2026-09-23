import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listWorkOrders } from '../api/endpoints'
import { StatusBlock } from '../components/StatusBlock'
import { WorkOrderKanban } from '../components/WorkOrderKanban'
import { WorkOrderList } from '../components/WorkOrderList'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'
import { canManageWorkOrderHeader, canSeeFinance } from '../lib/roles'

type ViewMode = 'list' | 'kanban'

const VIEW_STORAGE_KEY = 'sto.workOrders.view'

function readStoredView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_STORAGE_KEY)
    if (v === 'list' || v === 'kanban') return v
  } catch {
    /* ignore */
  }
  return 'kanban'
}

export function WorkOrdersPage() {
  const { me } = useUser()
  const { data, loading, error } = useApiResource(listWorkOrders)
  const canCreate = canManageWorkOrderHeader(me?.role)
  const canKanban = canSeeFinance(me?.role)

  const [view, setView] = useState<ViewMode>(() =>
    canKanban ? readStoredView() : 'list',
  )

  useEffect(() => {
    if (!canKanban) {
      setView('list')
      return
    }
    setView(readStoredView())
  }, [canKanban, me?.role])

  function switchView(next: ViewMode) {
    setView(next)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const items = data ?? []
  const activeView = canKanban ? view : 'list'

  return (
    <section className={`page${activeView === 'kanban' ? ' page--kanban' : ''}`}>
      <header className="page__header">
        <div className="page__title-block">
          <h1>Заказ-наряды</h1>
          <p className="page__lead">
            {canKanban
              ? 'Список или канбан по статусам ЗН. У рабочего суммы скрыты.'
              : 'Список доступных ЗН. У рабочего суммы скрыты.'}
          </p>
        </div>
        <div className="page__actions">
          {canKanban && (
            <div
              className="view-toggle"
              role="group"
              aria-label="Вид отображения заказ-нарядов"
            >
              <button
                type="button"
                className={`view-toggle__btn${activeView === 'list' ? ' is-active' : ''}`}
                aria-pressed={activeView === 'list'}
                onClick={() => switchView('list')}
              >
                Список
              </button>
              <button
                type="button"
                className={`view-toggle__btn${activeView === 'kanban' ? ' is-active' : ''}`}
                aria-pressed={activeView === 'kanban'}
                onClick={() => switchView('kanban')}
              >
                Канбан
              </button>
            </div>
          )}
          {canCreate && (
            <Link className="btn" to="/work-orders/new">
              Создать ЗН
            </Link>
          )}
        </div>
      </header>

      {activeView === 'kanban' ? (
        <div className="kanban-wrap">
          <StatusBlock
            loading={loading}
            error={error}
            empty={false}
            emptyText="Нет заказ-нарядов для этой роли"
          >
            {!loading && !error && (
              <WorkOrderKanban items={items} role={me?.role} />
            )}
          </StatusBlock>
        </div>
      ) : (
        <div className="card card--flush">
          <StatusBlock
            loading={loading}
            error={error}
            empty={!items.length}
            emptyText="Нет заказ-нарядов для этой роли"
          >
            <WorkOrderList items={items} role={me?.role} />
          </StatusBlock>
        </div>
      )}
    </section>
  )
}
