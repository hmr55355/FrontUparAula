import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Moon, Sun, UserCircle, X, ChevronDown } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { useAuthStore } from '@/store/authStore'
import { useActiveCourseStore } from '@/store/activeCourseStore'
import { useThemeStore } from '@/store/themeStore'
import { useViewModeStore } from '@/store/viewModeStore'
import { useEnsureActiveCourse } from '@/hooks/useEnsureActiveCourse'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { navItemsFor, type NavItem } from '@/config/navItems'
import type { GroupSubject } from '@/types'

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { isDark, toggle } = useThemeStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { data: institution } = useCurrentInstitution()
  const effectiveRole = useEffectiveRole()
  const isRealAdmin = institution?.my_role === 'admin'
  const visibleNavItems = navItemsFor(effectiveRole)
  // El curso activo es contexto del aula: en la vista Administrador no aplica.
  const showCourseSwitcher = effectiveRole !== 'admin'

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
          {showCourseSwitcher ? (
            <CourseSwitcher courses={courses} />
          ) : (
            <span className="text-sm font-medium text-muted-foreground">Vista Administrador</span>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Cambiar tema">
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <NotificationBell />
          <NavLink to="/profile" className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-muted">
            <UserCircle className="h-6 w-6" />
            <span className="hidden text-sm font-medium sm:inline">{user?.name}</span>
          </NavLink>
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto border-r bg-card p-3 lg:block">
          {isRealAdmin && <ViewModeToggle />}
          <Nav items={visibleNavItems} onNavigate={() => {}} />
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

              {showCourseSwitcher && (
                <div className="relative mb-3 sm:hidden">
                  <p className="mb-1 px-1 text-xs font-medium uppercase text-muted-foreground">Curso activo</p>
                  <CourseSwitcher courses={courses} fullWidth />
                </div>
              )}

              {isRealAdmin && <ViewModeToggle />}
              <Nav items={visibleNavItems} onNavigate={() => setDrawerOpen(false)} />
              <Button variant="outline" className="mt-4 w-full" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </aside>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 pb-24">
          {/* key=pathname: si un módulo se rompe, cambiar de módulo desde el
              sidebar (que queda fuera de este límite) remonta el contenido con
              un ErrorBoundary limpio en vez de quedar atascado en la falla. */}
          <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}

function CourseSwitcher({ courses, fullWidth = false }: { courses?: GroupSubject[]; fullWidth?: boolean }) {
  const { activeCourse } = useActiveCourseStore()
  const [courseMenuOpen, setCourseMenuOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setCourseMenuOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted',
          fullWidth ? 'w-full justify-between' : 'max-w-xs'
        )}
      >
        <span className="truncate">
          📚 {activeCourse ? `${activeCourse.groupName} — ${activeCourse.subjectName}` : 'Selecciona un curso'}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0" />
      </button>

      {courseMenuOpen && (
        <div
          className={cn(
            'absolute left-0 top-full z-50 mt-1 rounded-md border bg-popover p-1 shadow-lg',
            fullWidth ? 'w-full' : 'w-72'
          )}
        >
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
  )
}

function ViewModeToggle() {
  const viewMode = useViewModeStore((s) => s.viewMode)
  const setViewMode = useViewModeStore((s) => s.setViewMode)

  return (
    <div className="mb-3">
      <p className="mb-1 px-1 text-xs font-medium uppercase text-muted-foreground">Vista</p>
      <div className="flex gap-1">
        <button
          onClick={() => setViewMode('admin')}
          className={cn(
            'flex-1 rounded-md border px-2 py-1.5 text-sm',
            viewMode === 'admin' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
          )}
        >
          Admin
        </button>
        <button
          onClick={() => setViewMode('teacher')}
          className={cn(
            'flex-1 rounded-md border px-2 py-1.5 text-sm',
            viewMode === 'teacher' ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'
          )}
        >
          Docente
        </button>
      </div>
    </div>
  )
}

function Nav({ items, onNavigate }: { items: NavItem[]; onNavigate: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon }) => (
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
