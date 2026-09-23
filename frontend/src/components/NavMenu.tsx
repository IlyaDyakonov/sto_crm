import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', end: true, label: 'Дашборд' },
  { to: '/work-orders', end: false, label: 'Заказ-наряды' },
  { to: '/clients', end: false, label: 'Клиенты / авто' },
  { to: '/tasks', end: false, label: 'Задачи' },
] as const

export function NavMenu() {
  return (
    <nav className="app-nav" aria-label="Основное меню">
      <ul className="app-nav__list">
        {LINKS.map(({ to, end, label }) => (
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
        ))}
      </ul>
    </nav>
  )
}
