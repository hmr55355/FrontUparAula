import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { attendanceApi } from '@/services/api/attendance'
import { getAttendanceColor } from '@/utils/attendanceHelpers'
import { ATTENDANCE_CYCLE, ATTENDANCE_LABELS } from '@/types/attendance'
import type { AttendanceStatus } from '@/types/attendance'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function TakeAttendanceDialog({
  open,
  onOpenChange,
  groupSubjectId,
  periodId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupSubjectId: number
  periodId: number
}) {
  const queryClient = useQueryClient()
  const [date, setDate] = useState(today())
  const [statuses, setStatuses] = useState<Record<number, AttendanceStatus | null>>({})
  const [justifications, setJustifications] = useState<Record<number, string>>({})
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', 'day', groupSubjectId, date],
    queryFn: () => attendanceApi.day(groupSubjectId, date),
    enabled: open && !!groupSubjectId,
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
      const current = prev[studentId] ?? null
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
    if (!data) return
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
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
      onOpenChange(false)
    } catch {
      toast.error('No pudimos guardar la asistencia.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tomar asistencia</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          <Button variant="outline" size="sm" onClick={markAllPresent}>
            Marcar todos presentes
          </Button>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Cargando lista...</p>}

        {!isLoading && data && (
          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
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
        )}

        <Button size="lg" onClick={save} disabled={saving || isLoading} className="w-full">
          {saving ? 'Guardando...' : 'Guardar asistencia'}
        </Button>
      </DialogContent>
    </Dialog>
  )
}
