import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useMonitorCourse } from '@/components/layout/MonitorLayout'
import { monitorAppApi } from '@/services/api/monitorApp'
import { localDateString } from '@/utils/dateHelpers'
import { PendingApprovalNote, submitErrorMessage } from '@/pages/monitor/MonitorAttendance'

/** El monitor cuenta participaciones de la clase y las envía juntas al docente. */
export function MonitorParticipation() {
  const { course } = useMonitorCourse()
  const queryClient = useQueryClient()
  const [date, setDate] = useState(localDateString())
  const [counts, setCounts] = useState<Record<number, number>>({})
  const [saving, setSaving] = useState(false)

  const { data } = useQuery({
    queryKey: ['monitor', 'roster', course?.id],
    queryFn: () => monitorAppApi.roster(course!.id),
    enabled: !!course,
  })

  const change = (studentId: number, delta: number) =>
    setCounts((prev) => ({ ...prev, [studentId]: Math.max(0, Math.min(20, (prev[studentId] ?? 0) + delta)) }))

  const entries = Object.entries(counts)
    .filter(([, points]) => points > 0)
    .map(([studentId, points]) => ({ student_id: Number(studentId), points }))

  const submit = async () => {
    if (!course || entries.length === 0) return
    setSaving(true)
    try {
      await monitorAppApi.submit(course.id, 'participation', { date, entries })
      toast.success('Participaciones enviadas a tu docente para aprobación.')
      setCounts({})
      queryClient.invalidateQueries({ queryKey: ['monitor', 'submissions'] })
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
        <h1 className="text-lg font-semibold">Participación</h1>
        <Input type="date" value={date} max={localDateString()} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      </div>
      <PendingApprovalNote />
      <div className="flex flex-col gap-2">
        {data?.students.map((student) => {
          const count = counts[student.id] ?? 0
          return (
            <Card key={student.id}>
              <CardContent className="flex items-center justify-between gap-3 py-2">
                <span className="font-medium">
                  {student.last_name} {student.first_name}
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => change(student.id, -1)} disabled={count === 0}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-lg font-semibold">{count}</span>
                  <Button size="icon" className="h-9 w-9" onClick={() => change(student.id, 1)} aria-label={`Sumar participación a ${student.first_name}`}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Button size="lg" onClick={submit} disabled={saving || entries.length === 0}>
        {saving ? 'Enviando...' : `Enviar ${entries.reduce((sum, e) => sum + e.points, 0)} participaciones`}
      </Button>
    </div>
  )
}
