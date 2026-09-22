import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarCheck, Table2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { attendanceApi } from '@/services/api/attendance'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { useActiveCourseStore } from '@/store/activeCourseStore'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { getAttendanceColor } from '@/utils/attendanceHelpers'
import type { AttendanceStatus } from '@/types/attendance'

const SHORT_LABELS: Record<AttendanceStatus, string> = {
  presente: 'P',
  ausente_injustificado: 'A',
  tarde: 'T',
  ausente_justificado: 'J',
  retirado_temprano: 'R',
}

const LEGEND_NAMES: Record<AttendanceStatus, string> = {
  presente: 'Presente',
  ausente_injustificado: 'Ausente',
  tarde: 'Tarde',
  ausente_justificado: 'Justificada',
  retirado_temprano: 'Retirado',
}

// Al tocar una celda se pasa al siguiente estado (sin "sin registrar": borrar
// un registro no es algo que se haga por accidente con un toque).
const SHEET_CYCLE: AttendanceStatus[] = ['presente', 'ausente_injustificado', 'tarde', 'ausente_justificado']

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function formatHeader(date: string) {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()]
  return { weekday, label: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}` }
}

/**
 * Planilla de asistencia: estudiantes × fechas del período, como la planilla de
 * notas. Cada celda muestra el estado de ese día y se puede corregir tocándola.
 */
export function AttendanceSheet() {
  const { activeCourse } = useActiveCourseStore()
  const groupSubjectId = activeCourse?.groupSubjectId
  const queryClient = useQueryClient()
  const [savingCell, setSavingCell] = useState<string | null>(null)

  const { data: courses } = useQuery({ queryKey: ['group-subjects', 'mine'], queryFn: groupSubjectsApi.myCourses })
  const course = courses?.find((c) => c.id === groupSubjectId)
  const { data: periods, activePeriod } = useActivePeriod(course?.academic_year_id)
  const [periodId, setPeriodId] = useState<number | null>(null)

  useEffect(() => {
    if (activePeriod && (periodId === null || !periods?.some((p) => p.id === periodId))) {
      setPeriodId(activePeriod.id)
    }
  }, [activePeriod, periods, periodId])

  const { data: sheet, isLoading } = useQuery({
    queryKey: ['attendance-sheet', groupSubjectId, periodId],
    queryFn: () => attendanceApi.sheet(groupSubjectId as number, periodId as number),
    enabled: !!groupSubjectId && !!periodId,
  })

  const cycleCell = async (studentId: number, date: string) => {
    if (!groupSubjectId || !sheet) return
    const current = sheet.records[studentId]?.[date]?.status
    const next = current ? SHEET_CYCLE[(SHEET_CYCLE.indexOf(current) + 1) % SHEET_CYCLE.length] : 'presente'
    const cellKey = `${studentId}:${date}`

    setSavingCell(cellKey)
    try {
      await attendanceApi.bulkSave(groupSubjectId, date, [{ student_id: studentId, status: next }])
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet', groupSubjectId] })
      queryClient.invalidateQueries({ queryKey: ['attendance', 'day', groupSubjectId, date] })
      queryClient.invalidateQueries({ queryKey: ['grades-sheet', groupSubjectId] })
    } catch {
      toast.error('No pudimos guardar el cambio.')
    } finally {
      setSavingCell(null)
    }
  }

  if (!groupSubjectId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecciona un curso activo en el encabezado para ver su planilla de asistencia.
        </CardContent>
      </Card>
    )
  }

  const totals = (studentId: number) => {
    const rows = Object.values(sheet?.records[studentId] ?? {})
    return {
      absences: rows.filter((r) => r.status === 'ausente_injustificado').length,
      justified: rows.filter((r) => r.status === 'ausente_justificado').length,
      late: rows.filter((r) => r.status === 'tarde').length,
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            <Table2 className="mb-1 inline h-5 w-5 text-primary" /> Planilla de asistencia
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeCourse?.groupName} — {activeCourse?.subjectName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={periodId ?? ''}
            onChange={(e) => setPeriodId(Number(e.target.value))}
          >
            {periods?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" asChild>
            <Link to="/attendance">
              <CalendarCheck className="h-4 w-4" /> Tomar asistencia
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {SHEET_CYCLE.map((status) => {
          const { background, text } = getAttendanceColor(status)
          return (
            <span key={status} className="rounded px-2 py-1 font-medium" style={{ backgroundColor: background, color: text }}>
              {SHORT_LABELS[status]} = {LEGEND_NAMES[status]}
            </span>
          )
        })}
        <span className="text-muted-foreground">· Toca una celda para cambiar el estado.</span>
      </div>

      {isLoading || !sheet ? (
        <Skeleton className="h-96 w-full" />
      ) : sheet.dates.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Todavía no hay asistencia registrada en este período.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[180px] border-b border-r bg-card px-3 py-2 text-left">
                  Estudiante
                </th>
                {sheet.dates.map((date) => {
                  const { weekday, label } = formatHeader(date)
                  return (
                    <th key={date} className="min-w-[52px] border-b border-l px-1 py-1 text-center font-medium">
                      <span className="block text-[11px] text-muted-foreground">{weekday}</span>
                      {label}
                    </th>
                  )
                })}
                <th className="border-b border-l bg-muted px-2 py-2 text-center font-medium" title="Faltas injustificadas">
                  A
                </th>
                <th className="border-b border-l bg-muted px-2 py-2 text-center font-medium" title="Faltas justificadas">
                  J
                </th>
                <th className="border-b border-l bg-muted px-2 py-2 text-center font-medium" title="Llegadas tarde">
                  T
                </th>
              </tr>
            </thead>
            <tbody>
              {sheet.students.map((student) => {
                const studentTotals = totals(student.id)
                return (
                  <tr key={student.id} className="hover:bg-muted/30">
                    <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2 font-medium">
                      {student.last_name} {student.first_name}
                    </td>
                    {sheet.dates.map((date) => {
                      const cell = sheet.records[student.id]?.[date]
                      const { background, text } = getAttendanceColor(cell?.status ?? null)
                      const cellKey = `${student.id}:${date}`
                      return (
                        <td key={date} className="border-b border-l p-0 text-center">
                          <button
                            type="button"
                            className="block w-full px-1 py-2 font-semibold hover:ring-2 hover:ring-inset hover:ring-primary disabled:opacity-50"
                            style={{ backgroundColor: background, color: text }}
                            title={cell?.justification ?? undefined}
                            disabled={savingCell === cellKey}
                            onClick={() => cycleCell(student.id, date)}
                          >
                            {cell ? SHORT_LABELS[cell.status] : '·'}
                          </button>
                        </td>
                      )
                    })}
                    <td className="border-b border-l px-2 py-2 text-center font-semibold">{studentTotals.absences}</td>
                    <td className="border-b border-l px-2 py-2 text-center">{studentTotals.justified}</td>
                    <td className="border-b border-l px-2 py-2 text-center">{studentTotals.late}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
