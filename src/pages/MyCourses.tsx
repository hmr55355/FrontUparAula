import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, ArrowRight } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import type { GroupSubject } from '@/types'

export function MyCourses() {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['group-subjects', 'mine'],
    queryFn: groupSubjectsApi.myCourses,
  })

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

      <div className="grid gap-4 sm:grid-cols-2">
        {courses?.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  )
}

function CourseCard({ course }: { course: GroupSubject }) {
  const { activePeriod, isLoading } = useActivePeriod(course.academic_year_id)

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
            <Link to={`/grades/${course.id}/${activePeriod.id}`}>
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
