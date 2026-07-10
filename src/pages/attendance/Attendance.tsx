import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CalendarCheck, History } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { attendanceApi } from '@/services/api/attendance'
import { getAttendanceColor } from '@/utils/attendanceHelpers'
import { ATTENDANCE_CYCLE, ATTENDANCE_LABELS } from '@/types/attendance'
import type { AttendanceStatus } from '@/types/attendance'
import { useActiveCourseStore } from '@/store/activeCourseStore'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function Attendance() {
  const { activeCourse } = useActiveCourseStore()
  const queryClient = useQueryClient()
  const [date, setDate] = useState(today())
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus | null>>({})
  const [justifications, setJustifications] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)

  const groupSubjectId = activeCourse?.groupSubjectId

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'day', groupSubjectId, date],
    queryFn: () => attendanceApi.day(groupSubjectId as number, date),
    enabled: !!groupSubjectId,
  })

  useEffect(() => {
    if (!data) return
    const initialStatuses: Record<number, AttendanceStatus | null> = {}
    const initialJustifications: Record<number, string> = {}
    data.students.forEach((s) => {
      const record = data.records[s.id]
      initialStatuses[s.id] = record?.status ?? null
      initialJustifications[s.id] = record?.justification ?? ''
    })
    setStatuses(initialStatuses)
    setJustifications(initialJustifications)
  }, [data])

  const cycleStatus = (studentId: number) => {
    setStatuses((prev) => {
      const current = prev[studentId] ?? null;
      const currentIndex = ATTENDANCE_CYCLE.indexOf(current)
      const next = ATTENDANCE_CYCLE[(currentIndex + 1) % ATTENDANCE_CYCLE.length]
      return { ...prev, [studentId]: next }
    })
  }

  const markAllPresent = () => {
    if (!data) return
    const next: Record<number, AttendanceStatus | null> = {}
    data.students.forEach((s) => (next[s.id] = 'presente'))
    setStatuses(next)
  }

  const save = async () => {
    if (!groupSubjectId || !data) return
    const records = data.students
      .filter((s) => statuses[s.id] !== null && statuses[s.id] !== undefined)
      .map((s) => ({
        student_id: s.id,
        status: statuses[s.id] as AttendanceStatus,
        justification: justifications[s.id] || undefined,
      }))

    if (records.length === 0) {
      toast.error('Registra al menos un estudiante.')
      return
    }

    setSaving(true)
    try {
      const result = await attendanceApi.bulkSave(groupSubjectId, date, records)
      toast.success(`Asistencia guardada (${result.count} estudiantes).`)
      queryClient.invalidateQueries({ queryKey: ['attendance', 'day', groupSubjectId, date] })
    } catch {
      toast.error('No pudimos guardar la asistencia.')
    } finally {
      setSaving(false)
    }
  }

  if (!groupSubjectId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecciona un curso activo en el encabezado para pasar lista.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            <CalendarCheck className="mb-1 inline h-5 w-5 text-primary" /> Asistencia
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeCourse?.groupName} — {activeCourse?.subjectName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button variant="outline" size="sm" asChild>
            <Link to="/attendance/history">
              <History className="h-4 w-4" /> Historial
            </Link>
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando lista...</p>}

      {!isLoading && data && (
        <>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllPresent}>
              Marcar todos presentes
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {data.students.map((student) => {
              const status = statuses[student.id] ?? null
              const { background, text } = getAttendanceColor(status)
              const isAbsent = status === 'ausente_injustificado' || status === 'ausente_justificado'
              return (
                <Card key={student.id}>
                  <CardContent className="flex flex-col gap-2 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">
                        {student.last_name} {student.first_name}
                        {' · '}
                        <Link to={`/student/${student.id}`} className="text-sm font-normal text-primary hover:underline">
                          Ver perfil →
                        </Link>
                      </span>
                      <button
                        onClick={() => cycleStatus(student.id)}
                        className="min-w-[140px] rounded-md px-3 py-2 text-sm font-semibold"
                        style={{ backgroundColor: background, color: text }}
                      >
                        {status ? ATTENDANCE_LABELS[status] : '⚪ Sin registrar'}
                      </button>
                    </div>
                    {isAbsent && (
                      <Input
                        placeholder="Justificación (opcional)"
                        value={justifications[student.id] ?? ''}
                        onChange={(e) => setJustifications((prev) => ({ ...prev, [student.id]: e.target.value }))}
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <Button size="lg" onClick={save} disabled={saving} className="w-full">
            {saving ? 'Guardando...' : 'Guardar asistencia'}
          </Button>
        </>
      )}
    </div>
  )
}
