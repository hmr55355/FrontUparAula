import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useMonitorCourse } from '@/components/layout/MonitorLayout'
import { monitorAppApi } from '@/services/api/monitorApp'
import { getAttendanceColor } from '@/utils/attendanceHelpers'
import { localDateString } from '@/utils/dateHelpers'
import { ATTENDANCE_CYCLE, ATTENDANCE_LABELS, type AttendanceStatus } from '@/types/attendance'
import type { AttendancePayload } from '@/types/monitors'

export function submitErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return 'No pudimos enviar el registro.'
  const errors = error.response?.data?.errors as Record<string, string[]> | undefined
  return (errors && Object.values(errors)[0]?.[0]) || error.response?.data?.message || 'No pudimos enviar el registro.'
}

export function PendingApprovalNote() {
  return (
    <p className="rounded-md bg-primary/5 px-3 py-2 text-sm text-muted-foreground">
      Lo que registres se envía a tu docente. Solo cuenta cuando él o ella lo apruebe.
    </p>
  )
}

/** Pase de lista del monitor: igual al del docente, pero queda pendiente de aprobación. */
export function MonitorAttendance() {
  const { course } = useMonitorCourse()
  const queryClient = useQueryClient()
  const [date, setDate] = useState(localDateString())
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus | null>>({})
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['monitor', 'roster', course?.id, date],
    queryFn: () => monitorAppApi.roster(course!.id, date),
    enabled: !!course,
  })

  // Si ya hay un envío pendiente para ese día se muestra lo enviado (y guardar lo
  // actualiza); si no, lo que el docente ya tiene aprobado.
  useEffect(() => {
    if (!data) return
    const pending = data.pending_submission?.payload as AttendancePayload | undefined
    const initial: Record<number, AttendanceStatus | null> = {}
    data.students.forEach((s) => {
      initial[s.id] = pending?.records.find((r) => r.student_id === s.id)?.status ?? data.records[s.id]?.status ?? null
    })
    setStatuses(initial)
  }, [data])

  const cycle = (studentId: number) =>
    setStatuses((prev) => {
      const index = ATTENDANCE_CYCLE.indexOf(prev[studentId] ?? null)
      return { ...prev, [studentId]: ATTENDANCE_CYCLE[(index + 1) % ATTENDANCE_CYCLE.length] }
    })

  const markAllPresent = () =>
    setStatuses(Object.fromEntries((data?.students ?? []).map((s) => [s.id, 'presente' as AttendanceStatus])))

  const submit = async () => {
    if (!course || !data) return
    const records = data.students
      .filter((s) => statuses[s.id])
      .map((s) => ({ student_id: s.id, status: statuses[s.id] as AttendanceStatus }))
    if (records.length === 0) {
      toast.error('Registra al menos un estudiante.')
      return
    }
    setSaving(true)
    try {
      await monitorAppApi.submit(course.id, 'attendance', { date, records })
      toast.success('Asistencia enviada a tu docente para aprobación.')
      queryClient.invalidateQueries({ queryKey: ['monitor'] })
    } catch (error) {
      toast.error(submitErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  if (!course) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold">Asistencia</h1>
        <Input
          type="date"
          value={date}
          max={localDateString()}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto"
        />
      </div>
      <PendingApprovalNote />
      {data?.pending_submission && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          Ya enviaste la asistencia de este día y está pendiente de aprobación. Si la cambias y guardas, se actualiza
          ese mismo envío.
        </p>
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Cargando lista...</p>}
      {data && (
        <>
          <Button variant="outline" size="sm" className="w-fit" onClick={markAllPresent}>
            Marcar todos presentes
          </Button>
          <div className="flex flex-col gap-2">
            {data.students.map((student) => {
              const status = statuses[student.id] ?? null
              const { background, text } = getAttendanceColor(status)
              return (
                <Card key={student.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <span className="font-medium">
                      {student.last_name} {student.first_name}
                    </span>
                    <button
                      onClick={() => cycle(student.id)}
                      className="min-w-[140px] rounded-md px-3 py-2 text-sm font-semibold"
                      style={{ backgroundColor: background, color: text }}
                    >
                      {status ? ATTENDANCE_LABELS[status] : '⚪ Sin registrar'}
                    </button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          <Button size="lg" onClick={submit} disabled={saving}>
            {saving ? 'Enviando...' : data.pending_submission ? 'Actualizar envío' : 'Enviar para aprobación'}
          </Button>
        </>
      )}
    </div>
  )
}
