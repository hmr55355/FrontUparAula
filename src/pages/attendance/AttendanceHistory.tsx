import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { attendanceApi } from '@/services/api/attendance'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { useActiveCourseStore } from '@/store/activeCourseStore'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { ATTENDANCE_LABELS } from '@/types/attendance'
import { localDateString } from '@/utils/dateHelpers'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return localDateString(d)
}

export function AttendanceHistory() {
  const { activeCourse } = useActiveCourseStore()
  const groupSubjectId = activeCourse?.groupSubjectId
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(daysAgo(0))
  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  const { data: courses } = useQuery({ queryKey: ['group-subjects', 'mine'], queryFn: groupSubjectsApi.myCourses })
  const course = courses?.find((c) => c.id === groupSubjectId)
  const { activePeriod } = useActivePeriod(course?.academic_year_id)

  const { data: records, isLoading } = useQuery({
    queryKey: ['attendance', 'range', groupSubjectId, from, to],
    queryFn: () => attendanceApi.range(groupSubjectId as number, from, to),
    enabled: !!groupSubjectId,
  })

  const { data: stats } = useQuery({
    queryKey: ['attendance', 'stats', groupSubjectId, activePeriod?.id],
    queryFn: () => attendanceApi.stats(groupSubjectId as number, activePeriod!.id),
    enabled: !!groupSubjectId && !!activePeriod,
  })

  const byDate = useMemo(() => {
    const map = new Map<string, typeof records>()
    records?.forEach((r) => {
      const day = r.date.slice(0, 10)
      map.set(day, [...(map.get(day) ?? []), r])
    })
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [records])

  if (!groupSubjectId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecciona un curso activo en el encabezado para ver su historial.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-1 w-fit">
          <Link to="/attendance">
            <ChevronLeft className="h-4 w-4" /> Volver a pasar lista
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Historial de asistencia</h1>
        <p className="text-sm text-muted-foreground">
          {activeCourse?.groupName} — {activeCourse?.subjectName}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="text-sm text-muted-foreground">a</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando historial...</p>}

      <div className="flex flex-col gap-2">
        {byDate.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Sin registros de asistencia en este rango.</p>
        )}
        {byDate.map(([day, dayRecords]) => {
          const absences = dayRecords?.filter((r) => r.status !== 'presente') ?? []
          return (
            <Card key={day}>
              <CardContent className="py-3">
                <button
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => setExpandedDate(expandedDate === day ? null : day)}
                >
                  <span className="font-medium">{day}</span>
                  <span className="text-sm text-muted-foreground">
                    {dayRecords?.length ?? 0} registrados · {absences.length} con novedad
                  </span>
                </button>
                {expandedDate === day && (
                  <div className="mt-2 flex flex-col gap-1 border-t pt-2">
                    {(dayRecords ?? []).map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-sm">
                        <span>
                          {r.student?.last_name} {r.student?.first_name}
                        </span>
                        <Badge variant={r.status === 'presente' ? 'success' : 'danger'}>
                          {ATTENDANCE_LABELS[r.status]}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking de faltas (período activo)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {!stats || stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin faltas registradas en el período activo.</p>
          ) : (
            stats.map((row) => (
              <div key={row.student_id} className="flex items-center justify-between text-sm">
                <span>{row.student_name}</span>
                <span className="text-muted-foreground">
                  {row.ausente_injustificado} injustificadas · {row.ausente_justificado} justificadas · {row.tarde} tardanzas
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
