import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { groupsApi } from '@/services/api/groups'
import { behaviorApi } from '@/services/api/behavior'
import { BEHAVIOR_CATEGORY_LABELS, BEHAVIOR_TYPE_LABELS } from '@/types/behavior'
import type { BehaviorAnnotation, BehaviorCategory, BehaviorType } from '@/types/behavior'

export function NewAnnotationDialog({
  open,
  onOpenChange,
  groupId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  onCreated: (annotation: BehaviorAnnotation) => void
}) {
  const queryClient = useQueryClient()
  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => groupsApi.students(groupId),
  })

  const [studentId, setStudentId] = useState<number | ''>('')
  const [type, setType] = useState<BehaviorType>('positiva')
  const [category, setCategory] = useState<BehaviorCategory>('convivencia')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [actionTaken, setActionTaken] = useState('')
  const [requiresContact, setRequiresContact] = useState(false)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setStudentId('')
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
    try {
      const annotation = await behaviorApi.create({
        student_id: studentId,
        group_id: groupId,
        date: new Date().toISOString().slice(0, 10),
        type,
        category,
        title,
        description,
        action_taken: actionTaken || undefined,
        requires_parent_contact: requiresContact,
      })
      toast.success('Anotación guardada.')
      queryClient.invalidateQueries({ queryKey: ['behavior', groupId] })
      onOpenChange(false)
      reset()
      onCreated(annotation)
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
          <DialogTitle>Nueva anotación</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Estudiante</Label>
            <SearchableSelect
              value={studentId}
              onChange={setStudentId}
              placeholder="Selecciona un estudiante"
              options={(students ?? []).map((s) => ({ id: s.id, label: `${s.last_name} ${s.first_name}` }))}
            />
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

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar anotación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
