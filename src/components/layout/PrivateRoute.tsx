import { Navigate, Outlet } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { AppLayout } from '@/components/layout/AppLayout'

export function PrivateRoute() {
  const token = useAuthStore((s) => s.token)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
