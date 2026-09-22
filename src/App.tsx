import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PublicHome } from '@/pages/PublicHome'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { Onboarding } from '@/pages/onboarding/Onboarding'
import { PrivateRoute } from '@/components/layout/PrivateRoute'
import { TeacherViewGuard } from '@/components/layout/TeacherViewGuard'
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
const Monitors = lazy(() => import('@/pages/monitors/Monitors').then((m) => ({ default: m.Monitors })))
const MonitorReview = lazy(() => import('@/pages/monitors/MonitorReview').then((m) => ({ default: m.MonitorReview })))
const Participations = lazy(() =>
  import('@/pages/participations/Participations').then((m) => ({ default: m.Participations }))
)
const MonitorLayout = lazy(() =>
  import('@/components/layout/MonitorLayout').then((m) => ({ default: m.MonitorLayout }))
)
const MonitorAttendance = lazy(() =>
  import('@/pages/monitor/MonitorAttendance').then((m) => ({ default: m.MonitorAttendance }))
)
const MonitorParticipation = lazy(() =>
  import('@/pages/monitor/MonitorParticipation').then((m) => ({ default: m.MonitorParticipation }))
)
const MonitorBehavior = lazy(() => import('@/pages/monitor/MonitorBehavior').then((m) => ({ default: m.MonitorBehavior })))
const MonitorSubmissions = lazy(() =>
  import('@/pages/monitor/MonitorSubmissions').then((m) => ({ default: m.MonitorSubmissions }))
)
const AttendanceSheet = lazy(() =>
  import('@/pages/attendance/AttendanceSheet').then((m) => ({ default: m.AttendanceSheet }))
)
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
        {/* Red de último recurso: cubre errores fuera del contenido de cada
            módulo (AppLayout tiene su propio ErrorBoundary por ruta) — por
            ejemplo en PrivateRoute o en el layout mismo. */}
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/onboarding" element={<Onboarding />} />

              {/* App del monitor de curso: layout propio, sin nada del docente. */}
              <Route path="/monitor" element={<MonitorLayout />}>
                <Route index element={<MonitorAttendance />} />
                <Route path="participation" element={<MonitorParticipation />} />
                <Route path="behavior" element={<MonitorBehavior />} />
                <Route path="submissions" element={<MonitorSubmissions />} />
              </Route>

              <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/my-courses" element={<TeacherViewGuard><MyCourses /></TeacherViewGuard>} />
                <Route path="/schedule" element={<TeacherViewGuard><Schedule /></TeacherViewGuard>} />
                <Route path="/attendance" element={<TeacherViewGuard><Attendance /></TeacherViewGuard>} />
                <Route path="/attendance/history" element={<TeacherViewGuard><AttendanceHistory /></TeacherViewGuard>} />
                <Route path="/attendance/sheet" element={<TeacherViewGuard><AttendanceSheet /></TeacherViewGuard>} />
                <Route path="/participations" element={<TeacherViewGuard><Participations /></TeacherViewGuard>} />
                <Route path="/monitors" element={<TeacherViewGuard><Monitors /></TeacherViewGuard>} />
                <Route path="/monitors/reviews/:submissionId" element={<TeacherViewGuard><MonitorReview /></TeacherViewGuard>} />
                <Route path="/behavior" element={<TeacherViewGuard><Behavior /></TeacherViewGuard>} />
                <Route path="/citations" element={<TeacherViewGuard><Citations /></TeacherViewGuard>} />
                <Route path="/observations" element={<TeacherViewGuard><Observations /></TeacherViewGuard>} />
                <Route path="/student/:id" element={<TeacherViewGuard><StudentProfile /></TeacherViewGuard>} />
                <Route path="/homeworks" element={<TeacherViewGuard><Homeworks /></TeacherViewGuard>} />
                <Route path="/homeworks/:homeworkId" element={<TeacherViewGuard><HomeworkDeliveries /></TeacherViewGuard>} />
                <Route path="/plans" element={<TeacherViewGuard><Plans /></TeacherViewGuard>} />
                <Route path="/copies" element={<TeacherViewGuard><Copies /></TeacherViewGuard>} />
                <Route path="/copies/:chargeId" element={<TeacherViewGuard><CopyChargeDetail /></TeacherViewGuard>} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Configuracion />} />
                <Route path="/grades/:groupSubjectId/:periodId" element={<TeacherViewGuard><GradeSheet /></TeacherViewGuard>} />
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
        </ErrorBoundary>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}

export default App
