import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { NavMenu } from './NavMenu'

export function Layout() {
  return (
    <div className="app-shell">
      <Header />
      <NavMenu />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
