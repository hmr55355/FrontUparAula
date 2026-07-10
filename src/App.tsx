import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'

import { PublicHome } from '@/pages/PublicHome'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { Onboarding } from '@/pages/onboarding/Onboarding'
import { Dashboard } from '@/pages/Dashboard'
import { Profile } from '@/pages/Profile'
import { MyCourses } from '@/pages/MyCourses'
import { GradeSheet } from '@/pages/grades/GradeSheet'
import { Schedule } from '@/pages/schedule/Schedule'
import { Attendance } from '@/pages/attendance/Attendance'
import { AttendanceHistory } from '@/pages/attendance/AttendanceHistory'
import { Behavior } from '@/pages/behavior/Behavior'
import { Citations } from '@/pages/citations/Citations'
import { StudentProfile } from '@/pages/student/StudentProfile'
import { Homeworks } from '@/pages/homeworks/Homeworks'
import { HomeworkDeliveries } from '@/pages/homeworks/HomeworkDeliveries'
import { Plans } from '@/pages/plans/Plans'
import { Copies } from '@/pages/copies/Copies'
import { CopyChargeDetail } from '@/pages/copies/CopyChargeDetail'
import { InstitutionSettings } from '@/pages/institution/InstitutionSettings'
import { PlaceholderPage } from '@/pages/PlaceholderPage'
import { PrivateRoute } from '@/components/layout/PrivateRoute'
import { RoleGuard } from '@/components/layout/RoleGuard'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const FUTURE_MODULES: Array<{ path: string; title: string }> = [
  { path: '/reports', title: 'Reportes' },
  { path: '/notifications', title: 'Notificaciones' },
  { path: '/settings', title: 'Configuración' },
]

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />

          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/attendance/history" element={<AttendanceHistory />} />
            <Route path="/behavior" element={<Behavior />} />
            <Route path="/citations" element={<Citations />} />
            <Route path="/student/:id" element={<StudentProfile />} />
            <Route path="/homeworks" element={<Homeworks />} />
            <Route path="/homeworks/:homeworkId" element={<HomeworkDeliveries />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/copies" element={<Copies />} />
            <Route path="/copies/:chargeId" element={<CopyChargeDetail />} />
            <Route path="/grades/:groupSubjectId/:periodId" element={<GradeSheet />} />
            <Route
              path="/institution/settings"
              element={
                <RoleGuard allow={['admin']}>
                  <InstitutionSettings />
                </RoleGuard>
              }
            />
            {FUTURE_MODULES.map(({ path, title }) => (
              <Route key={path} path={path} element={<PlaceholderPage title={title} />} />
            ))}
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App
