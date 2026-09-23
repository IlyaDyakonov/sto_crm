import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { UserProvider } from './context/UserContext'
import { ClientDetailPage } from './pages/ClientDetailPage'
import { ClientsPage } from './pages/ClientsPage'
import { DashboardPage } from './pages/DashboardPage'
import { TasksPage } from './pages/TasksPage'
import { VehicleDetailPage } from './pages/VehicleDetailPage'
import { WorkOrderDetailPage } from './pages/WorkOrderDetailPage'
import { WorkOrdersPage } from './pages/WorkOrdersPage'

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="work-orders" element={<WorkOrdersPage />} />
            <Route path="work-orders/new" element={<WorkOrderDetailPage />} />
            <Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
            <Route path="clients" element={<ClientsPage />} />
            <Route path="clients/:clientId" element={<ClientDetailPage />} />
            <Route
              path="clients/:clientId/vehicles/:vehicleId"
              element={<VehicleDetailPage />}
            />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}
