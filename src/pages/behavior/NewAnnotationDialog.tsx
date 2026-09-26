import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { groupsApi } from '@/services/api/groups'
import { behaviorApi } from '@/services/api/behavior'
import { BEHAVIOR_CATEGORY_LABELS, BEHAVIOR_TYPE_LABELS } from '@/types/behavior'
import type { BehaviorAnnotation, BehaviorCategory, BehaviorType } from '@/types/behavior'
import { localDateString } from '@/utils/dateHelpers'

/**
 * Crear o editar una anotación (con `annotation`, edita y permite eliminar; el
 * estudiante no cambia). El backend solo deja editar al autor o a un admin.
 */
export function NewAnnotationDialog({
  open,
  onOpenChange,
  groupId,
  onCreated,
  annotation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  onCreated?: (annotation: BehaviorAnnotation) => void
  annotation?: BehaviorAnnotation
}) {
  const queryClient = useQueryClient()
  const isEdit = !!annotation
  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => groupsApi.students(groupId),
  })

  const [studentId, setStudentId] = useState<number | ''>(annotation?.student_id ?? '')
  const [date, setDate] = useState(annotation?.date.slice(0, 10) ?? localDateString())
  const [type, setType] = useState<BehaviorType>(annotation?.type ?? 'positiva')
  const [category, setCategory] = useState<BehaviorCategory>(annotation?.category ?? 'convivencia')
  const [title, setTitle] = useState(annotation?.title ?? '')
  const [description, setDescription] = useState(annotation?.description ?? '')
  const [actionTaken, setActionTaken] = useState(annotation?.action_taken ?? '')
  const [requiresContact, setRequiresContact] = useState(annotation?.requires_parent_contact ?? false)
  const [saving, setSaving] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['behavior', groupId] })
    if (studentId) queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] })
  }

  const errorText = (error: unknown, fallback: string) =>
    (axios.isAxiosError(error) && error.response?.data?.message) || fallback

  const remove = async () => {
    if (!annotation || !window.confirm(`¿Eliminar la anotación "${annotation.title}"?`)) return
    setSaving(true)
    try {
      await behaviorApi.remove(annotation.id)
      toast.success('Anotación eliminada.')
      invalidate()
      onOpenChange(false)
    } catch (error) {
      toast.error(errorText(error, 'No pudimos eliminar la anotación.'))
    } finally {
      setSaving(false)
    }
  }

  const reset = () => {
    setStudentId('')
    setDate(localDateString())
    setType('positiva')
    setCategory('convivencia')
    setTitle('')
    setDescription('')
    setActionTaken('')
    setRequiresContact(false)
  }

  const save = async () => {
    if (!studentId || !title || !description) {
      toast.error('Completa estudiante, título y descripción.')
      return
    }

    setSaving(true)
    if (annotation) {
      try {
        await behaviorApi.update(annotation.id, {
          date,
          type,
          category,
          title,
          description,
          action_taken: actionTaken || undefined,
          requires_parent_contact: requiresContact,
        })
        toast.success('Anotación actualizada.')
        invalidate()
        onOpenChange(false)
      } catch (error) {
        toast.error(errorText(error, 'No pudimos actualizar la anotación.'))
      } finally {
        setSaving(false)
      }
      return
    }
    try {
      const created = await behaviorApi.create({
        student_id: studentId,
        group_id: groupId,
        date,
        type,
        category,
        title,
        description,
        action_taken: actionTaken || undefined,
        requires_parent_contact: requiresContact,
      })
      toast.success('Anotación guardada.')
      invalidate()
      onOpenChange(false)
      reset()
      onCreated?.(created)
    } catch {
      toast.error('No pudimos guardar la anotación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar anotación' : 'Nueva anotación'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Estudiante</Label>
            <SearchableSelect
              value={studentId}
              onChange={setStudentId}
              placeholder="Selecciona un estudiante"
              disabled={isEdit}
              options={(students ?? []).map((s) => ({ id: s.id, label: `${s.last_name} ${s.first_name}` }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Fecha</Label>
            <Input type="date" value={date} max={localDateString()} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <select
                className="h-12 w-full rounded-md border border-input bg-transparent px-3"
                value={type}
                onChange={(e) => setType(e.target.value as BehaviorType)}
              >
                {Object.entries(BEHAVIOR_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <select
                className="h-12 w-full rounded-md border border-input bg-transparent px-3"
                value={category}
                onChange={(e) => setCategory(e.target.value as BehaviorCategory)}
              >
                {Object.entries(BEHAVIOR_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Título corto</Label>
            <Input maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Acción tomada (opcional)</Label>
            <Input value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requiresContact} onChange={(e) => setRequiresContact(e.target.checked)} />
            ¿Requiere contactar al padre?
          </label>
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
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar anotación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
