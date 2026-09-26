import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { useActiveShift } from '@/hooks/useActiveShift'
import { useActiveCourseStore } from '@/store/activeCourseStore'
import type { GroupSubject } from '@/types'

export function MyCourses() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['group-subjects', 'mine'],
    queryFn: groupSubjectsApi.myCourses,
  })
  const { teacherShifts, activeShiftId } = useActiveShift()
  // Con varias jornadas: todos los cursos, agrupados por jornada (la activa primero).
  const sections =
    teacherShifts.length > 1
      ? [...teacherShifts]
          .sort((a, b) => Number(b.id === activeShiftId) - Number(a.id === activeShiftId))
          .map((shift) => ({
            id: shift.id,
            title: shift.name,
            courses: (courses ?? []).filter((c) => c.group?.shift_id === shift.id),
          }))
          .concat([
            { id: 0, title: 'Sin jornada', courses: (courses ?? []).filter((c) => !c.group?.shift_id) },
          ])
          .filter((section) => section.courses.length > 0)
      : [{ id: 0, title: '', courses: courses ?? [] }]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <h1 className="text-xl font-semibold">Mis Cursos</h1>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}

      {!isLoading && (!courses || courses.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no tienes cursos asignados. Pídele al administrador de tu institución que te asigne un grupo-materia.
          </CardContent>
        </Card>
      )}

      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-2">
          {section.title && (
            <h2 className="text-sm font-semibold uppercase text-muted-foreground">
              Jornada {section.title}
              {section.id === activeShiftId && <span className="ml-2 normal-case text-primary">(activa)</span>}
            </h2>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {section.courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function CourseCard({ course }: { course: GroupSubject }) {
  const { activePeriod, isLoading } = useActivePeriod(course.academic_year_id)
  const setActiveCourse = useActiveCourseStore((s) => s.setActiveCourse)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          {course.group?.name}
          <Badge style={{ backgroundColor: course.subject?.color, color: '#fff', borderColor: 'transparent' }}>
            {course.subject?.name}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {course.group?.student_count ?? 0} estudiantes
        </span>
        <Button size="sm" disabled={isLoading || !activePeriod} asChild={!isLoading && !!activePeriod}>
          {!isLoading && activePeriod ? (
            <Link
              to={`/grades/${course.id}/${activePeriod.id}`}
              // Activarlo también mueve la jornada si el curso es de otra.
              onClick={() =>
                setActiveCourse({
                  groupSubjectId: course.id,
                  groupName: course.group?.name ?? '',
                  subjectName: course.subject?.name ?? '',
                  subjectColor: course.subject?.color ?? '#1565C0',
                })
              }
            >
              Ir a la planilla <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <span>Sin período activo</span>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
