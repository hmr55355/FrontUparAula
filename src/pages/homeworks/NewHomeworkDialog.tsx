import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { gradeSectionsApi } from '@/services/api/gradeSections'
import { homeworksApi } from '@/services/api/homeworks'
import { localDateString } from '@/utils/dateHelpers'

function today() {
  return localDateString()
}

export function NewHomeworkDialog({
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
  const { data: sections } = useQuery({
    queryKey: ['grade-sections', groupSubjectId, periodId],
    queryFn: () => gradeSectionsApi.list(groupSubjectId, periodId),
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedDate, setAssignedDate] = useState(today())
  const [dueDate, setDueDate] = useState('')
  const [maxScore, setMaxScore] = useState('10')
  const [isGraded, setIsGraded] = useState(false)
  const [gradeSectionId, setGradeSectionId] = useState<number | ''>('')
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setTitle('')
    setDescription('')
    setAssignedDate(today())
    setDueDate('')
    setMaxScore('10')
    setIsGraded(false)
    setGradeSectionId('')
    setWeight('')
  }

  const save = async () => {
    if (!title || !dueDate) {
      toast.error('Completa el título y la fecha de entrega.')
      return
    }
    if (isGraded && (!gradeSectionId || !weight)) {
      toast.error('Selecciona la sección y el peso de la columna generada.')
      return
    }

    setSaving(true)
    try {
      await homeworksApi.create({
        group_subject_id: groupSubjectId,
        period_id: periodId,
        title,
        description: description || undefined,
        assigned_date: assignedDate,
        due_date: dueDate,
        max_score: Number(maxScore),
        is_graded: isGraded,
        grade_section_id: isGraded ? Number(gradeSectionId) : undefined,
        weight: isGraded ? Number(weight) : undefined,
      })
      toast.success('Tarea creada.')
      queryClient.invalidateQueries({ queryKey: ['homeworks', groupSubjectId, periodId] })
      onOpenChange(false)
      reset()
    } catch {
      toast.error('No pudimos crear la tarea.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva tarea</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Descripción (opcional)</Label>
            <textarea
              className="min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha de asignación</Label>
              <Input type="date" value={assignedDate} onChange={(e) => setAssignedDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fecha de entrega</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Puntaje máximo</Label>
            <Input type="number" step="0.1" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isGraded} onChange={(e) => setIsGraded(e.target.checked)} />
            ¿Genera calificación en la planilla?
          </label>

          {isGraded && (
            <div className="flex flex-col gap-2 rounded-md border p-2">
              <div className="space-y-1">
                <Label>Sección de la planilla</Label>
                <select
                  className="h-12 w-full rounded-md border border-input bg-transparent px-3"
                  value={gradeSectionId}
                  onChange={(e) => setGradeSectionId(Number(e.target.value))}
                >
                  <option value="" disabled>
                    Selecciona una sección
                  </option>
                  {sections?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Peso de la columna (%)</Label>
                <Input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar tarea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
