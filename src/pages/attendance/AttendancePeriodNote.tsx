import { useQuery } from '@tanstack/react-query'

import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { periodForDate } from '@/utils/dateHelpers'

/**
 * Una inasistencia afecta la nota del período cuyas fechas contienen el día
 * registrado (así lo resuelve el backend), no necesariamente el período marcado
 * como activo. Esta nota lo hace visible para que el docente no espere ver el
 * cambio en otra planilla.
 */
export function AttendancePeriodNote({ groupSubjectId, date }: { groupSubjectId: number; date: string }) {
  const { data: courses } = useQuery({ queryKey: ['group-subjects', 'mine'], queryFn: groupSubjectsApi.myCourses })
  const course = courses?.find((c) => c.id === groupSubjectId)
  const { data: periods, activePeriod } = useActivePeriod(course?.academic_year_id)

  if (!periods) return null

  const datePeriod = periodForDate(periods, date)

  if (!datePeriod) {
    return (
      <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
        Esta fecha no está dentro de ningún período del año escolar: la asistencia se guarda, pero no afectará ninguna
        nota. Revisa las fechas de los períodos en Configuración → Año escolar.
      </p>
    )
  }

  if (activePeriod && datePeriod.id !== activePeriod.id) {
    return (
      <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
        Esta fecha pertenece al <strong>{datePeriod.name}</strong>, pero el período activo es el{' '}
        <strong>{activePeriod.name}</strong>. La asistencia afectará las notas del {datePeriod.name}.
      </p>
    )
  }

  return <p className="text-xs text-muted-foreground">Esta asistencia cuenta para el {datePeriod.name}.</p>
}
