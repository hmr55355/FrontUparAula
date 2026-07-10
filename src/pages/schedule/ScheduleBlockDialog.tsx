import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { scheduleApi, type ScheduleBlockPayload } from '@/services/api/schedule'
import { DAY_LABELS } from '@/types/schedule'
import type { ClassScheduleBlock } from '@/types/schedule'

export function ScheduleBlockDialog({
  open,
  onOpenChange,
  block,
  defaultDay,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  block?: ClassScheduleBlock | null
  defaultDay?: number
}) {
  const queryClient = useQueryClient()
  const { data: courses } = useQuery({ queryKey: ['group-subjects', 'mine'], queryFn: groupSubjectsApi.myCourses })

  const [groupSubjectId, setGroupSubjectId] = useState<number | ''>('')
  const [dayOfWeek, setDayOfWeek] = useState(defaultDay ?? 1)
  const [startTime, setStartTime] = useState('07:00')
  const [endTime, setEndTime] = useState('07:50')
  const [classroom, setClassroom] = useState('')
  const [blockLabel, setBlockLabel] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setGroupSubjectId(block?.group_subject_id ?? '')
      setDayOfWeek(block?.day_of_week ?? defaultDay ?? 1)
      setStartTime(block?.start_time?.slice(0, 5) ?? '07:00')
      setEndTime(block?.end_time?.slice(0, 5) ?? '07:50')
      setClassroom(block?.classroom ?? '')
      setBlockLabel(block?.block_label ?? '')
    }
  }, [open, block, defaultDay])

  const save = async (confirm = false) => {
    if (!groupSubjectId) {
      toast.error('Selecciona un curso.')
      return
    }
    const course = courses?.find((c) => c.id === groupSubjectId)
    if (!course) return

    const payload: ScheduleBlockPayload = {
      group_subject_id: groupSubjectId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      classroom: classroom || undefined,
      block_label: blockLabel || undefined,
      academic_year_id: course.academic_year_id,
      confirm,
    }

    setSaving(true)
    try {
      const result = block ? await scheduleApi.update(block.id, payload) : await scheduleApi.create(payload)
      if (result.warnings?.length) {
        result.warnings.forEach((w) => toast.warning(w))
      }
      toast.success('Bloque guardado.')
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
      onOpenChange(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        if (window.confirm(error.response.data.message + ' ¿Continuar de todas formas?')) {
          await save(true)
          return
        }
      } else {
        toast.error('No pudimos guardar el bloque.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{block ? 'Editar bloque' : 'Agregar bloque de clase'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Curso</Label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-3"
              value={groupSubjectId}
              onChange={(e) => setGroupSubjectId(Number(e.target.value))}
            >
              <option value="" disabled>
                Selecciona un grupo-materia
              </option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.group?.name} — {c.subject?.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Día</Label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-3"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
            >
              {Object.entries(DAY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Hora inicio</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Hora fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Salón (opcional)</Label>
            <Input value={classroom} onChange={(e) => setClassroom(e.target.value)} placeholder="Salón 10-01" />
          </div>

          <div className="space-y-1">
            <Label>Etiqueta (opcional)</Label>
            <Input value={blockLabel} onChange={(e) => setBlockLabel(e.target.value)} placeholder="1ra hora" />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => save(false)} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
