import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { VoiceRecorderButton } from '@/components/VoiceRecorderButton'
import { classPlansApi } from '@/services/api/classPlans'
import { CLASS_PLAN_STATUS_LABELS } from '@/types/classPlans'
import type { ClassPlan, ClassPlanStatus } from '@/types/classPlans'
import { localDateString } from '@/utils/dateHelpers'

function today() {
  return localDateString()
}

export function ClassPlanDialog({
  open,
  onOpenChange,
  groupSubjectId,
  plan,
  initialDate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupSubjectId: number
  plan?: ClassPlan | null
  initialDate?: string
}) {
  const queryClient = useQueryClient()
  const isEditing = !!plan?.id

  const [date, setDate] = useState(today())
  const [topic, setTopic] = useState('')
  const [objectives, setObjectives] = useState('')
  const [activities, setActivities] = useState('')
  const [resources, setResources] = useState('')
  const [whatWasDone, setWhatWasDone] = useState('')
  const [pending, setPending] = useState('')
  const [attendanceNote, setAttendanceNote] = useState('')
  const [homeworkAssigned, setHomeworkAssigned] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<ClassPlanStatus>('planeada')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDate(plan?.date.slice(0, 10) ?? initialDate ?? today())
    setTopic(plan?.topic ?? '')
    setObjectives(plan?.objectives ?? '')
    setActivities(plan?.activities ?? '')
    setResources(plan?.resources ?? '')
    setWhatWasDone(plan?.what_was_done ?? '')
    setPending(plan?.pending_for_next_class ?? '')
    setAttendanceNote(plan?.attendance_note ?? '')
    setHomeworkAssigned(plan?.homework_assigned ?? '')
    setNotes(plan?.notes ?? '')
    setStatus(plan?.status ?? 'planeada')
  }, [open, plan, initialDate])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['class-plans', groupSubjectId] })

  const save = async () => {
    if (!topic) {
      toast.error('Escribe el tema de la clase.')
      return
    }

    setSaving(true)
    try {
      if (plan?.id) {
        await classPlansApi.update(plan.id, {
          topic,
          objectives: objectives || null,
          activities: activities || null,
          resources: resources || null,
          what_was_done: whatWasDone || null,
          pending_for_next_class: pending || null,
          attendance_note: attendanceNote || null,
          homework_assigned: homeworkAssigned || null,
          notes: notes || null,
          status,
        })
        toast.success('Bitácora actualizada.')
      } else {
        await classPlansApi.create({
          group_subject_id: groupSubjectId,
          date,
          topic,
          objectives: objectives || undefined,
          activities: activities || undefined,
          resources: resources || undefined,
        })
        toast.success('Planeación creada.')
      }
      invalidate()
      onOpenChange(false)
    } catch {
      toast.error('No pudimos guardar la bitácora.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar bitácora' : 'Nueva planeación'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={isEditing} />
            </div>
            {isEditing && (
              <div className="space-y-1">
                <Label>Estado</Label>
                <select
                  className="h-12 w-full rounded-md border border-input bg-transparent px-3"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClassPlanStatus)}
                >
                  {Object.entries(CLASS_PLAN_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Tema de la clase</Label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Objetivos</Label>
            <textarea
              className="min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Actividades planeadas</Label>
            <textarea
              className="min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2"
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Recursos necesarios</Label>
            <textarea
              className="min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2"
              value={resources}
              onChange={(e) => setResources(e.target.value)}
            />
          </div>

          {plan?.id && (
            <>
              <hr />
              <p className="text-sm font-semibold text-muted-foreground">Bitácora (durante/después de la clase)</p>

              <div className="space-y-1">
                <Label>Qué se hizo realmente</Label>
                <textarea
                  className="min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2"
                  value={whatWasDone}
                  onChange={(e) => setWhatWasDone(e.target.value)}
                />
                <VoiceRecorderButton relatedType="class_plan" relatedId={plan.id} fieldName="what_was_done" />
              </div>

              <div className="space-y-1">
                <Label>Pendiente para la próxima clase</Label>
                <textarea
                  className="min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2"
                  value={pending}
                  onChange={(e) => setPending(e.target.value)}
                />
                <VoiceRecorderButton
                  relatedType="class_plan"
                  relatedId={plan.id}
                  fieldName="pending_for_next_class"
                />
              </div>

              <div className="space-y-1">
                <Label>Tarea asignada (opcional)</Label>
                <textarea
                  className="min-h-[50px] w-full rounded-md border border-input bg-transparent px-3 py-2"
                  value={homeworkAssigned}
                  onChange={(e) => setHomeworkAssigned(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Nota rápida de asistencia (opcional)</Label>
                <Input
                  placeholder='Ej: "28 de 32 asistieron"'
                  value={attendanceNote}
                  onChange={(e) => setAttendanceNote(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label>Notas generales</Label>
                <textarea
                  className="min-h-[50px] w-full rounded-md border border-input bg-transparent px-3 py-2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
