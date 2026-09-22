import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, Users, MapPin, Clock, ClipboardCheck, NotebookText } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { scheduleApi } from '@/services/api/schedule'
import { attendanceApi } from '@/services/api/attendance'
import { classPlansApi } from '@/services/api/classPlans'
import { useActiveCourseStore } from '@/store/activeCourseStore'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { PreviousClassPlanDialog } from '@/pages/plans/PreviousClassPlanDialog'
import { navItemsFor } from '@/config/navItems'
import { AdminDashboard } from '@/pages/AdminDashboard'
import type { GroupSubject } from '@/types'
import { localDateString } from '@/utils/dateHelpers'

function today() {
  return localDateString()
}

export function Dashboard() {
  const effectiveRole = useEffectiveRole()
  return effectiveRole === 'admin' ? <AdminDashboard /> : <TeacherDashboard />
}

function TeacherDashboard() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['group-subjects', 'mine'],
    queryFn: groupSubjectsApi.myCourses,
  })

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <CurrentClassCard />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {navItemsFor('teacher')
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

      <div>
        <h2 className="mb-3 text-lg font-semibold">Mis cursos</h2>
        {isLoading && <p className="text-sm text-muted-foreground">Cargando cursos...</p>}
        {!isLoading && (!courses || courses.length === 0) && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aún no tienes cursos asignados. Pídele al administrador de tu institución que te asigne un grupo-materia.
            </CardContent>
          </Card>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses?.map((course) => (
            <DashboardCourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </div>
  )
}

function DashboardCourseCard({ course }: { course: GroupSubject }) {
  const navigate = useNavigate()
  const setActiveCourse = useActiveCourseStore((s) => s.setActiveCourse)
  const { activePeriod, isLoading } = useActivePeriod(course.academic_year_id)

  const goToGrades = () => {
    if (!activePeriod) return
    setActiveCourse({
      groupSubjectId: course.id,
      groupName: course.group?.name ?? '',
      subjectName: course.subject?.name ?? '',
      subjectColor: course.subject?.color ?? '#1565C0',
    })
    navigate(`/grades/${course.id}/${activePeriod.id}`)
  }

  return (
    <Card
      className={!isLoading && activePeriod ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}
      onClick={!isLoading && activePeriod ? goToGrades : undefined}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          {course.group?.name}
          <Badge style={{ backgroundColor: course.subject?.color, color: '#fff', borderColor: 'transparent' }}>
            {course.subject?.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        {course.group?.student_count ?? 0} estudiantes
        {!isLoading && !activePeriod && <span className="ml-auto text-xs">Sin período activo</span>}
      </CardContent>
    </Card>
  )
}

function CurrentClassCard() {
  const navigate = useNavigate()
  const setActiveCourse = useActiveCourseStore((s) => s.setActiveCourse)

  const { data, isLoading } = useQuery({
    queryKey: ['schedule', 'current-class'],
    queryFn: scheduleApi.currentClass,
    refetchInterval: 60_000,
  })

  const block = data?.block
  const { activePeriod } = useActivePeriod(block?.group_subject?.academic_year_id)

  const { data: attendanceToday } = useQuery({
    queryKey: ['attendance', 'day', block?.group_subject?.id, today()],
    queryFn: () => attendanceApi.day(block!.group_subject!.id, today()),
    enabled: !!block?.group_subject,
  })
  const attendanceRegistered = !!attendanceToday && Object.keys(attendanceToday.records).length > 0

  const { data: previousPlan } = useQuery({
    queryKey: ['class-plans', 'previous', block?.group_subject?.id],
    queryFn: () => classPlansApi.previous(block!.group_subject!.id),
    enabled: !!block?.group_subject,
  })
  const [previousPlanDialogOpen, setPreviousPlanDialogOpen] = useState(false)

  const goToClass = () => {
    if (!block?.group_subject || !activePeriod) return
    setActiveCourse({
      groupSubjectId: block.group_subject.id,
      groupName: block.group_subject.group?.name ?? '',
      subjectName: block.group_subject.subject?.name ?? '',
      subjectColor: block.group_subject.subject?.color ?? '#1565C0',
    })
    navigate(attendanceRegistered ? `/grades/${block.group_subject.id}/${activePeriod.id}` : '/attendance')
  }

  if (isLoading) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="py-6 text-sm text-muted-foreground">Cargando horario...</CardContent>
      </Card>
    )
  }

  const status = data?.status ?? 'sin_clase_ahora'

  const styles = {
    en_curso: { border: 'border-success/40', bg: 'bg-success/5', label: '🟢 Clase en curso' },
    proxima: { border: 'border-warning/40', bg: 'bg-warning/5', label: '🟡 Próxima clase' },
    sin_clase_ahora: { border: 'border-muted', bg: 'bg-muted/30', label: '📅 No tienes clase en este momento' },
  }[status]

  return (
    <Card
      className={`${styles.border} ${styles.bg} ${block ? 'cursor-pointer transition-shadow hover:shadow-md' : ''}`}
      onClick={block ? goToClass : undefined}
    >
      <CardContent className="flex items-center gap-4 py-6">
        <CalendarClock className="h-8 w-8 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium text-primary">{styles.label}</p>
          {block ? (
            <>
              <p className="text-lg font-semibold">
                {block.group_subject?.group?.name} — {block.group_subject?.subject?.name}
              </p>
              <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {block.classroom && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {block.classroom}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
                </span>
                {status === 'proxima' && data?.minutes_until !== undefined && (
                  <span>en {data.minutes_until} min</span>
                )}
                <span className="flex items-center gap-1">
                  <ClipboardCheck className="h-3 w-3" />
                  {attendanceRegistered ? '✅ Asistencia registrada' : '📋 Asistencia: sin registrar'}
                </span>
              </p>
              <p className="mt-1 text-sm text-primary">
                {attendanceRegistered ? 'Toca para ir a la planilla →' : 'Toca para pasar lista →'}
              </p>
              {previousPlan && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviousPlanDialogOpen(true)
                  }}
                  className="mt-2 flex w-full flex-col gap-0.5 rounded-md border border-input bg-background/60 px-3 py-2 text-left text-sm"
                >
                  <span className="flex items-center gap-1 font-medium">
                    <NotebookText className="h-4 w-4" /> Clase anterior ({previousPlan.date.slice(0, 10)}): "
                    {previousPlan.topic}"
                  </span>
                  {previousPlan.pending_for_next_class && (
                    <span className="text-muted-foreground">Pendiente: {previousPlan.pending_for_next_class}</span>
                  )}
                  <span className="text-primary">Ver bitácora completa →</span>
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No tienes más bloques de clase hoy.</p>
          )}
        </div>
      </CardContent>

      <PreviousClassPlanDialog
        open={previousPlanDialogOpen}
        onOpenChange={setPreviousPlanDialogOpen}
        plan={previousPlan ?? null}
      />
    </Card>
  )
}
