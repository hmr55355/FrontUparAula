import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ThumbsDown, ThumbsUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { useMonitorCourse } from '@/components/layout/MonitorLayout'
import { monitorAppApi } from '@/services/api/monitorApp'
import { localDateString } from '@/utils/dateHelpers'
import { PendingApprovalNote, submitErrorMessage } from '@/pages/monitor/MonitorAttendance'

/** Punto positivo o negativo de comportamiento, con la observación que el docente valida. */
export function MonitorBehavior() {
  const { course } = useMonitorCourse()
  const queryClient = useQueryClient()
  const [studentId, setStudentId] = useState<number | ''>('')
  const [type, setType] = useState<'positiva' | 'negativa'>('positiva')
  const [observation, setObservation] = useState('')
  const [date, setDate] = useState(localDateString())
  const [saving, setSaving] = useState(false)

  const { data } = useQuery({
    queryKey: ['monitor', 'roster', course?.id],
    queryFn: () => monitorAppApi.roster(course!.id),
    enabled: !!course,
  })

  const submit = async () => {
    if (!course || !studentId || !observation.trim()) return
    setSaving(true)
    try {
      await monitorAppApi.submit(course.id, 'behavior', { date, student_id: studentId, type, observation: observation.trim() })
      toast.success('Anotación enviada a tu docente para aprobación.')
      setStudentId('')
      setObservation('')
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
      <h1 className="text-lg font-semibold">Comportamiento</h1>
      <PendingApprovalNote />
      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="space-y-1">
            <Label>Estudiante</Label>
            <SearchableSelect
              value={studentId}
              onChange={setStudentId}
              options={(data?.students ?? []).map((s) => ({ id: s.id, label: `${s.last_name} ${s.first_name}` }))}
              placeholder="Selecciona un estudiante"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={type === 'positiva' ? 'default' : 'outline'} onClick={() => setType('positiva')}>
              <ThumbsUp className="h-4 w-4" /> Positivo
            </Button>
            <Button
              variant={type === 'negativa' ? 'destructive' : 'outline'}
              onClick={() => setType('negativa')}
            >
              <ThumbsDown className="h-4 w-4" /> Negativo
            </Button>
          </div>
          <div className="space-y-1">
            <Label htmlFor="observation">Observación (obligatoria)</Label>
            <textarea
              id="observation"
              className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={observation}
              maxLength={1000}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="¿Qué pasó? Tu docente lo revisará antes de registrarlo."
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="behavior-date">Fecha</Label>
            <Input id="behavior-date" type="date" value={date} max={localDateString()} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          </div>
          <Button size="lg" onClick={submit} disabled={saving || !studentId || !observation.trim()}>
            {saving ? 'Enviando...' : 'Enviar para aprobación'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
