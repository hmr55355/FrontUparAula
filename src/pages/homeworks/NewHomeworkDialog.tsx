import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { gradeSectionsApi } from '@/services/api/gradeSections'
import { homeworksApi } from '@/services/api/homeworks'
import { localDateString } from '@/utils/dateHelpers'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'
import type { Homework } from '@/types/homeworks'

function today() {
  return localDateString()
}

/**
 * Crear o editar una tarea (con `homework`, edita y permite eliminar). La
 * sección y el peso de la columna que genera en la planilla solo se eligen al
 * crearla; después se ajustan desde "Configurar planilla".
 */
export function NewHomeworkDialog({
  open,
  onOpenChange,
  groupSubjectId,
  periodId,
  homework,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupSubjectId: number
  periodId: number
  homework?: Homework
  onDeleted?: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!homework
  const { data: sections } = useQuery({
    queryKey: ['grade-sections', groupSubjectId, periodId],
    queryFn: () => gradeSectionsApi.list(groupSubjectId, periodId),
    enabled: !isEdit,
  })

  const [title, setTitle] = useState(homework?.title ?? '')
  const [description, setDescription] = useState(homework?.description ?? '')
  const [notes, setNotes] = useState(homework?.notes ?? '')
  const [assignedDate, setAssignedDate] = useState(homework?.assigned_date.slice(0, 10) ?? today())
  const [dueDate, setDueDate] = useState(homework?.due_date.slice(0, 10) ?? '')
  const [maxScore, setMaxScore] = useState(homework ? String(Number(homework.max_score)) : '10')
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['homeworks', groupSubjectId, periodId] })
    queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
    if (homework) queryClient.invalidateQueries({ queryKey: ['homework-deliveries', homework.id] })
  }

  const remove = async () => {
    if (!homework) return
    if (!window.confirm(`¿Eliminar la tarea "${homework.title}"?`)) return
    setSaving(true)
    try {
      await homeworksApi.remove(homework.id)
    } catch (error) {
      // 409: la tarea ya tiene notas en la planilla — se pide una segunda confirmación.
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const ok = window.confirm(
          'Esta tarea tiene notas en la planilla. Si la eliminas, se borra su columna con esas notas y se recalculan las definitivas. ¿Continuar?'
        )
        if (!ok) {
          setSaving(false)
          return
        }
        try {
          await homeworksApi.remove(homework.id, true)
        } catch {
          toast.error('No pudimos eliminar la tarea.')
          setSaving(false)
          return
        }
      } else {
        toast.error('No pudimos eliminar la tarea.')
        setSaving(false)
        return
      }
    }
    setSaving(false)
    toast.success('Tarea eliminada.')
    invalidate()
    onOpenChange(false)
    onDeleted?.()
  }

  const save = async () => {
    if (!title || !dueDate) {
      toast.error('Completa el título y la fecha de entrega.')
      return
    }
    if (dueDate < assignedDate) {
      toast.error('La fecha de entrega no puede ser anterior a la de asignación.')
      return
    }
    if (isEdit && homework) {
      setSaving(true)
      try {
        await homeworksApi.update(homework.id, {
          title,
          description: description || undefined,
          notes: notes || undefined,
          assigned_date: assignedDate,
          due_date: dueDate,
          max_score: Number(maxScore),
        })
        toast.success('Tarea actualizada.')
        invalidate()
        onOpenChange(false)
      } catch {
        toast.error('No pudimos actualizar la tarea.')
      } finally {
        setSaving(false)
      }
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
        notes: notes || undefined,
      })
      toast.success('Tarea creada.')
      invalidate()
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
          <DialogTitle>{isEdit ? 'Editar tarea' : 'Nueva tarea'}</DialogTitle>
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

          <div className="space-y-1">
            <Label>Notas internas (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Solo las ves tú" />
          </div>

          {isEdit ? (
            homework?.is_graded && (
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Esta tarea genera una columna en la planilla. Su nombre y su nota máxima se actualizan con la tarea; la
                sección y el peso se cambian en "Configurar planilla".
              </p>
            )
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isGraded} onChange={(e) => setIsGraded(e.target.checked)} />
              ¿Genera calificación en la planilla?
            </label>
          )}

          {!isEdit && isGraded && (
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

        <DialogFooter className="gap-2 sm:justify-between">
          {isEdit ? (
            <Button variant="ghost" className="text-destructive" onClick={remove} disabled={saving}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar tarea'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
