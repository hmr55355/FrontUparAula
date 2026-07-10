import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileBarChart,
  ListChecks,
  Menu,
  MessageSquareWarning,
  Moon,
  NotebookPen,
  NotebookText,
  PhoneCall,
  Settings,
  Sun,
  UserCircle,
  Wallet,
  X,
  LayoutDashboard,
  ChevronDown,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useActiveCourseStore } from '@/store/activeCourseStore'
import { useThemeStore } from '@/store/themeStore'
import { useEnsureActiveCourse } from '@/hooks/useEnsureActiveCourse'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/my-courses', label: 'Mis Cursos', icon: BookOpen },
  { to: '/schedule', label: 'Horario', icon: CalendarClock },
  { to: '/attendance', label: 'Asistencia', icon: ClipboardCheck },
  { to: '/behavior', label: 'Comportamiento', icon: MessageSquareWarning },
  { to: '/citations', label: 'Citaciones', icon: PhoneCall },
  { to: '/observations', label: 'Observaciones', icon: NotebookText },
  { to: '/homeworks', label: 'Tareas', icon: ListChecks },
  { to: '/plans', label: 'Planeación', icon: NotebookPen },
  { to: '/copies', label: 'Copias', icon: Wallet },
  { to: '/reports', label: 'Reportes', icon: FileBarChart },
  { to: '/institution/settings', label: 'Institución', icon: Building2 },
  { to: '/settings', label: 'Configuración', icon: Settings },
]

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isDark, toggle } = useThemeStore()
  const { activeCourse } = useActiveCourseStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [courseMenuOpen, setCourseMenuOpen] = useState(false)

  const { data: courses } = useQuery({
    queryKey: ['group-subjects', 'mine'],
    queryFn: groupSubjectsApi.myCourses,
  })
  useEnsureActiveCourse(courses)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b bg-card px-4">
        <button
          className="rounded-md p-2 hover:bg-muted lg:hidden"
          onClick={() => setDrawerOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>

        <NavLink to="/dashboard" className="flex items-center gap-2 font-heading text-lg font-semibold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            UA
          </span>
          UparAula
        </NavLink>

        <div className="relative ml-2 hidden flex-1 sm:block">
          <button
            onClick={() => setCourseMenuOpen((v) => !v)}
            className="flex max-w-xs items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            📚 {activeCourse ? `${activeCourse.groupName} — ${activeCourse.subjectName}` : 'Selecciona un curso'}
            <ChevronDown className="h-4 w-4" />
          </button>

          {courseMenuOpen && (
            <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-md border bg-popover p-1 shadow-lg">
              {courses && courses.length > 0 ? (
                courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      useActiveCourseStore.getState().setActiveCourse({
                        groupSubjectId: c.id,
                        groupName: c.group?.name ?? '',
                        subjectName: c.subject?.name ?? '',
                        subjectColor: c.subject?.color ?? '#1565C0',
                      })
                      setCourseMenuOpen(false)
                    }}
                    className="flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span>
                      {c.group?.name} — {c.subject?.name}
                    </span>
                    {activeCourse?.groupSubjectId === c.id && <span>✓</span>}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">Aún no tienes cursos asignados.</p>
              )}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Notificaciones">
            <Bell className="h-5 w-5" />
          </Button>
          <NavLink to="/profile" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
            <UserCircle className="h-6 w-6" />
            <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
          </NavLink>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto border-r bg-card p-3 lg:block">
          <Nav onNavigate={() => {}} />
          <Button variant="outline" className="mt-4 w-full" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </aside>

        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-card p-3 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-heading font-semibold text-primary">UparAula</span>
                <button onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Nav onNavigate={() => setDrawerOpen(false)} />
              <Button variant="outline" className="mt-4 w-full" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 pb-24">{children}</main>
      </div>
    </div>
  )
}

function Nav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted',
              isActive && 'bg-primary/10 text-primary'
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
