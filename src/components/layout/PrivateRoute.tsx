import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { AppLayout } from '@/components/layout/AppLayout'

export function PrivateRoute() {
  const token = useAuthStore((s) => s.token)
  const isMonitor = useAuthStore((s) => s.user?.account_type === 'monitor')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  // Un monitor de curso nunca entra a la app del docente.
  if (isMonitor) {
    return <Navigate to="/monitor" replace />
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
