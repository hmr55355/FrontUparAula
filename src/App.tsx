import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'

import { PublicHome } from '@/pages/PublicHome'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { Onboarding } from '@/pages/onboarding/Onboarding'
import { PrivateRoute } from '@/components/layout/PrivateRoute'
import { RoleGuard } from '@/components/layout/RoleGuard'

// Todo lo que vive detrás de PrivateRoute se carga solo después de iniciar
// sesión — evita que el bundle inicial (landing/login, lo primero que baja
// cualquier visitante) cargue las ~18 páginas de la app completa de una vez.
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.Profile })))
const MyCourses = lazy(() => import('@/pages/MyCourses').then((m) => ({ default: m.MyCourses })))
const GradeSheet = lazy(() => import('@/pages/grades/GradeSheet').then((m) => ({ default: m.GradeSheet })))
const Schedule = lazy(() => import('@/pages/schedule/Schedule').then((m) => ({ default: m.Schedule })))
const Attendance = lazy(() => import('@/pages/attendance/Attendance').then((m) => ({ default: m.Attendance })))
const AttendanceHistory = lazy(() =>
  import('@/pages/attendance/AttendanceHistory').then((m) => ({ default: m.AttendanceHistory }))
)
const Behavior = lazy(() => import('@/pages/behavior/Behavior').then((m) => ({ default: m.Behavior })))
const Citations = lazy(() => import('@/pages/citations/Citations').then((m) => ({ default: m.Citations })))
const Observations = lazy(() => import('@/pages/observations/Observations').then((m) => ({ default: m.Observations })))
const StudentProfile = lazy(() => import('@/pages/student/StudentProfile').then((m) => ({ default: m.StudentProfile })))
const Homeworks = lazy(() => import('@/pages/homeworks/Homeworks').then((m) => ({ default: m.Homeworks })))
const HomeworkDeliveries = lazy(() =>
  import('@/pages/homeworks/HomeworkDeliveries').then((m) => ({ default: m.HomeworkDeliveries }))
)
const Plans = lazy(() => import('@/pages/plans/Plans').then((m) => ({ default: m.Plans })))
const Copies = lazy(() => import('@/pages/copies/Copies').then((m) => ({ default: m.Copies })))
const CopyChargeDetail = lazy(() =>
  import('@/pages/copies/CopyChargeDetail').then((m) => ({ default: m.CopyChargeDetail }))
)
const Reports = lazy(() => import('@/pages/reports/Reports').then((m) => ({ default: m.Reports })))
const Configuracion = lazy(() => import('@/pages/settings/Configuracion').then((m) => ({ default: m.Configuracion })))
const InstitutionSettings = lazy(() =>
  import('@/pages/institution/InstitutionSettings').then((m) => ({ default: m.InstitutionSettings }))
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // Colecciones muy reusadas y poco cambiantes (cursos, institución actual,
      // etc.) no necesitan re-pedirse en cada montaje de componente.
      staleTime: 60_000,
    },
  },
})

function RouteFallback() {
  return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Cargando...</div>
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
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
              <Route path="/observations" element={<Observations />} />
              <Route path="/student/:id" element={<StudentProfile />} />
              <Route path="/homeworks" element={<Homeworks />} />
              <Route path="/homeworks/:homeworkId" element={<HomeworkDeliveries />} />
              <Route path="/plans" element={<Plans />} />
              <Route path="/copies" element={<Copies />} />
              <Route path="/copies/:chargeId" element={<CopyChargeDetail />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Configuracion />} />
              <Route path="/grades/:groupSubjectId/:periodId" element={<GradeSheet />} />
              <Route
                path="/institution/settings"
                element={
                  <RoleGuard allow={['admin']}>
                    <InstitutionSettings />
                  </RoleGuard>
                }
              />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App
