import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  listBranches,
  listTasks,
  listUsers,
  listWorkOrders,
} from '../api/endpoints'
import { BranchPlanFactList } from '../components/BranchPlanFactList'
import { RevenueKpiStrip } from '../components/RevenueKpiStrip'
import { StaffRoster } from '../components/StaffRoster'
import { StatusBlock } from '../components/StatusBlock'
import { TaskList } from '../components/TaskList'
import { WorkOrderList } from '../components/WorkOrderList'
import { useUser } from '../context/UserContext'
import { useApiResource } from '../hooks/useApiResource'
import { canSeeFinance, roleBadgeClass, roleLabel } from '../lib/roles'

const DASHBOARD_LIMIT = 8

export function DashboardPage() {
  const { me, meLoading, meError } = useUser()
  const showFinance = canSeeFinance(me?.role)
  const isDirector = me?.role === 'director'

  const workOrders = useApiResource(listWorkOrders)
  const tasks = useApiResource(listTasks)

  const branchesFetcher = useCallback(
    (uid: number) =>
      showFinance ? listBranches(uid) : Promise.resolve([]),
    [showFinance],
  )
  const branches = useApiResource(branchesFetcher, [showFinance])

  const usersFetcher = useCallback(
    (uid: number) => (isDirector ? listUsers(uid) : Promise.resolve([])),
    [isDirector],
  )
  const users = useApiResource(usersFetcher, [isDirector])

  const loading =
    meLoading ||
    workOrders.loading ||
    tasks.loading ||
    (showFinance && branches.loading) ||
    (isDirector && users.loading)
  const error =
    meError ||
    workOrders.error ||
    tasks.error ||
    (showFinance ? branches.error : null) ||
    (isDirector ? users.error : null)

  const myOrders = (workOrders.data ?? []).slice(0, DASHBOARD_LIMIT)
  const myTasks = (tasks.data ?? []).slice(0, DASHBOARD_LIMIT)

  return (
    <section className="page">
      <header className="page__header">
        <div className="page__title-block">
          <h1>Дашборд</h1>
          <p className="page__lead">
            Краткие списки по текущей роли — переключите пользователя в шапке.
          </p>
        </div>
      </header>

      <StatusBlock loading={loading} error={error}>
        <div className="stack">
          {me && (
            <div className="card">
              <div className="title-with-badge">
                <strong>{me.full_name}</strong>
                <span className={roleBadgeClass(me.role)}>{roleLabel(me.role)}</span>
                <span className="muted">
                  {me.branch_id != null ? `филиал #${me.branch_id}` : 'вся сеть'}
                </span>
              </div>
            </div>
          )}

          {showFinance && (
            <>
              <RevenueKpiStrip
                workOrders={workOrders.data ?? []}
                role={me?.role}
              />

              <div className="card card--flush">
                <div className="card__header">
                  <h2 className="card__title">Филиалы — выручка (факт)</h2>
                </div>
                <BranchPlanFactList
                  branches={branches.data ?? []}
                  workOrders={workOrders.data ?? []}
                  canCreate={isDirector}
                  onCreated={branches.reload}
                />
              </div>
            </>
          )}

          <div className="card card--flush">
            <div className="card__header">
              <h2 className="card__title">Заказ-наряды</h2>
              <Link className="section-head__link" to="/work-orders">
                Все →
              </Link>
            </div>
            <WorkOrderList
              items={myOrders}
              role={me?.role}
              emptyText="Нет заказ-нарядов"
            />
          </div>

          <div className="card card--flush">
            <div className="card__header">
              <h2 className="card__title">Задачи</h2>
              <Link className="section-head__link" to="/tasks">
                Все →
              </Link>
            </div>
            <TaskList items={myTasks} emptyText="Нет задач" />
          </div>

          {isDirector && (
            <div className="card card--flush">
              <div className="card__header">
                <h2 className="card__title">Сотрудники</h2>
                <span className="muted">руководители и рабочие</span>
              </div>
              <StaffRoster
                users={users.data ?? []}
                branches={branches.data ?? []}
                canCreate
                onCreated={users.reload}
              />
            </div>
          )}
        </div>
      </StatusBlock>
    </section>
  )
}
