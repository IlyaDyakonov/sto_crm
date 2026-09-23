import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { NavMenu } from './NavMenu'

export function Layout() {
  return (
    <div>
      <Header />
      <NavMenu />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
