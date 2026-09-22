import { useEffect } from 'react'
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Hand, History, MessageSquareWarning, Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useThemeStore } from '@/store/themeStore'
import { useMonitorCourseStore } from '@/store/monitorCourseStore'
import { monitorAppApi } from '@/services/api/monitorApp'
import { authApi } from '@/services/api/auth'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import type { MonitorCourse } from '@/types/monitors'

const MONITOR_NAV = [
  { to: '/monitor', label: 'Asistencia', icon: ClipboardCheck, end: true },
  { to: '/monitor/participation', label: 'Participación', icon: Hand, end: false },
  { to: '/monitor/behavior', label: 'Comportamiento', icon: MessageSquareWarning, end: false },
  { to: '/monitor/submissions', label: 'Mis envíos', icon: History, end: false },
]

/** Curso activo del monitor, resuelto contra sus cursos vigentes. */
export function useMonitorCourse(): { course: MonitorCourse | undefined; courses: MonitorCourse[] | undefined; isLoading: boolean } {
  const { data: courses, isLoading } = useQuery({ queryKey: ['monitor', 'courses'], queryFn: monitorAppApi.courses })
  const courseMonitorId = useMonitorCourseStore((s) => s.courseMonitorId)
  const course = courses?.find((c) => c.id === courseMonitorId) ?? courses?.[0]
  return { course, courses, isLoading }
}

/**
 * App del monitor de curso: solo asistencia, participación y comportamiento de
 * los cursos donde su docente lo habilitó. Todo lo que envía queda pendiente
 * hasta que el docente lo apruebe.
 */
export function MonitorLayout() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isDark, toggle } = useThemeStore()
  const { course, courses } = useMonitorCourse()
  const setCourseMonitorId = useMonitorCourseStore((s) => s.setCourseMonitorId)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  if (!token) return <Navigate to="/login" replace />
  if (user?.account_type !== 'monitor') return <Navigate to="/dashboard" replace />

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Si el token ya no sirve, igual cerramos la sesión local.
    }
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
          UA
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">Monitor · {user?.name}</p>
          {courses && courses.length > 1 ? (
            <select
              className="h-7 max-w-full rounded border border-input bg-transparent px-1 text-xs"
              value={course?.id ?? ''}
              onChange={(e) => setCourseMonitorId(Number(e.target.value))}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.group_name} — {c.subject_name}
                </option>
              ))}
            </select>
          ) : (
            course && (
              <p className="truncate text-xs text-muted-foreground">
                {course.group_name} — {course.subject_name}
              </p>
            )
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          Salir
        </Button>
      </header>

      <nav className="sticky top-16 z-30 flex gap-1 overflow-x-auto border-b bg-card px-2 py-2">
        {MONITOR_NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`
            }
          >
            <Icon className="h-4 w-4" /> {label}
          </NavLink>
        ))}
      </nav>

      <main className="mx-auto max-w-2xl p-4 pb-24">
        {courses && courses.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">No tienes cursos asignados como monitor.</p>
        ) : (
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        )}
      </main>
    </div>
  )
}
