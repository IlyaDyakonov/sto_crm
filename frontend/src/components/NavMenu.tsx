import { NavLink } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { isWorker } from '../lib/roles'

const LINKS = [
  { to: '/', end: true, label: 'Дашборд', hideForWorker: false },
  { to: '/work-orders', end: false, label: 'Заказ-наряды', hideForWorker: false },
  { to: '/clients', end: false, label: 'Клиенты / авто', hideForWorker: true },
  { to: '/tasks', end: false, label: 'Задачи', hideForWorker: false },
] as const

export function NavMenu() {
  const { me } = useUser()
  const worker = isWorker(me?.role)

  return (
    <nav className="app-nav" aria-label="Основное меню">
      <ul className="app-nav__list">
        {LINKS.filter((l) => !(worker && l.hideForWorker)).map(
          ({ to, end, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  isActive ? 'app-nav__link is-active' : 'app-nav__link'
                }
              >
                {label}
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  )
}
