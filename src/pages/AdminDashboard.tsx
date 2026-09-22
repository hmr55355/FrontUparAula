import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, GraduationCap, UserCheck, Users, AlertTriangle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/services/api/client'
import { institutionsApi } from '@/services/api/institutions'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { navItemsFor } from '@/config/navItems'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { localDateString, periodForDate } from '@/utils/dateHelpers'

interface AssignmentGridSummary {
  groups: { id: number }[]
  subjects: { id: number }[]
  assignments: { group_id: number; subject_id: number }[]
  available_pairs?: { group_id: number; subject_id: number }[]
}

/**
 * Inicio de la vista Administrador: el estado de la institución de un vistazo
 * y accesos a lo que el admin gestiona. Reutiliza las mismas consultas (y
 * claves de caché, con la misma forma) que la pantalla de Institución.
 */
export function AdminDashboard() {
  const { data: institution } = useCurrentInstitution()
  const institutionId = institution?.id

  const { data: groups } = useQuery({
    queryKey: ['groups', institutionId],
    queryFn: () => institutionsApi.groups(institutionId as number),
    enabled: !!institutionId,
    staleTime: 3 * 60 * 1000,
  })

  const { data: teachersPage } = useQuery({
    queryKey: ['institutions', institutionId, 'teachers', 1],
    queryFn: () =>
      api
        .get<{ data: { status: string }[]; meta: { current_page: number; last_page: number; total: number } }>(
          `/institutions/${institutionId}/teachers`,
          { params: { page: 1 } }
        )
        .then((r) => r.data),
    enabled: !!institutionId,
    staleTime: 3 * 60 * 1000,
  })

  const { data: grid } = useQuery({
    queryKey: ['institutions', institutionId, 'assignment-grid'],
    queryFn: () =>
      api.get<AssignmentGridSummary>(`/institutions/${institutionId}/assignment-grid`).then((r) => r.data),
    enabled: !!institutionId,
    staleTime: 3 * 60 * 1000,
  })

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', institutionId],
    queryFn: () => institutionsApi.academicYears(institutionId as number),
    enabled: !!institutionId,
    staleTime: 3 * 60 * 1000,
  })
  const { data: periods, activePeriod } = useActivePeriod(academicYears?.find((y) => y.is_active)?.id)
  // Si el período marcado como activo no es el de la fecha de hoy, la asistencia
  // de hoy cuenta para otro período distinto al que los docentes ven por defecto.
  const todayPeriod = periodForDate(periods, localDateString())
  const periodMismatch = !!todayPeriod && !!activePeriod && todayPeriod.id !== activePeriod.id

  const students = groups?.reduce((sum, g) => sum + (g.student_count ?? 0), 0)
  const assigned = new Set(grid?.assignments.map((a) => `${a.group_id}:${a.subject_id}`))
  const possiblePairs =
    grid?.available_pairs ?? grid?.groups.flatMap((g) => grid.subjects.map((s) => ({ group_id: g.id, subject_id: s.id })))
  const unassigned = possiblePairs?.filter((p) => !assigned.has(`${p.group_id}:${p.subject_id}`)).length

  const stats = [
    { label: 'Docentes', value: teachersPage?.meta.total, icon: UserCheck },
    { label: 'Grupos', value: groups?.length, icon: Users },
    { label: 'Estudiantes', value: students, icon: GraduationCap },
    { label: 'Materias', value: grid?.subjects.length, icon: BookOpen },
  ]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{institution?.name}</h1>
        <p className="text-sm text-muted-foreground">Vista Administrador</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center gap-3 py-4">
              <Icon className="h-6 w-6 text-primary" />
              <div>
                <p className="text-2xl font-semibold">{value ?? '—'}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {periodMismatch && (
        <Card className="border-danger/40 bg-danger/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <p className="flex-1 text-sm">
              Hoy estamos en el <strong>{todayPeriod?.name}</strong>, pero el período activo sigue siendo el{' '}
              <strong>{activePeriod?.name}</strong>. Los docentes ven por defecto el {activePeriod?.name}, mientras la
              asistencia de hoy cuenta para el {todayPeriod?.name}.
            </p>
            <Link to="/settings" className="text-sm font-medium text-primary hover:underline">
              Cambiar en Año escolar →
            </Link>
          </CardContent>
        </Card>
      )}

      {unassigned !== undefined && unassigned > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="flex-1 text-sm">
              Hay <strong>{unassigned}</strong> {unassigned === 1 ? 'curso' : 'cursos'} (grupo + materia) sin docente asignado.
            </p>
            <Link to="/institution/settings" className="text-sm font-medium text-primary hover:underline">
              Ir a Asignaciones →
            </Link>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {navItemsFor('admin')
            .filter((item) => item.to !== '/dashboard')
            .map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-colors hover:border-primary hover:bg-primary/5"
              >
                <Icon className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
        </div>
      </div>
    </div>
  )
}
