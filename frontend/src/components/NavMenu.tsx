import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/', end: true, label: 'Дашборд' },
  { to: '/work-orders', end: false, label: 'Заказ-наряды' },
  { to: '/clients', end: false, label: 'Клиенты / авто' },
  { to: '/tasks', end: false, label: 'Задачи' },
] as const

export function NavMenu() {
  return (
    <nav>
      <ul>
        {LINKS.map(({ to, end, label }) => (
          <li key={to}>
            <NavLink to={to} end={end}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
