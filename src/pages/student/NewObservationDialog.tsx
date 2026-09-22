import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { groupsApi } from '@/services/api/groups'
import { observationsApi } from '@/services/api/observations'
import { OBSERVATION_TYPE_LABELS } from '@/types/observations'
import type { ObservationType } from '@/types/observations'
import { localDateString } from '@/utils/dateHelpers'

export function NewObservationDialog({
  open,
  onOpenChange,
  presetStudentId,
  groupId,
  periodId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  presetStudentId?: number
  groupId: number
  periodId?: number
}) {
  const queryClient = useQueryClient()
  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => groupsApi.students(groupId),
  })

  const [studentId, setStudentId] = useState<number | ''>(presetStudentId ?? '')
  const [type, setType] = useState<ObservationType>('seguimiento')
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setStudentId(presetStudentId ?? '')
      setType('seguimiento')
      setContent('')
      setIsPrivate(false)
    }
  }, [open, presetStudentId])

  const save = async () => {
    if (!studentId || !content) {
      toast.error('Selecciona el estudiante y escribe el contenido de la observación.')
      return
    }
    setSaving(true)
    try {
      await observationsApi.create({
        student_id: studentId,
        group_id: groupId,
        period_id: periodId,
        date: localDateString(),
        type,
        content,
        is_private: isPrivate,
      })
      toast.success('Observación guardada.')
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] })
      queryClient.invalidateQueries({ queryKey: ['observations', groupId] })
      onOpenChange(false)
    } catch {
      toast.error('No pudimos guardar la observación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva observación</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Estudiante</Label>
            <SearchableSelect
              value={studentId}
              onChange={setStudentId}
              disabled={!!presetStudentId}
              placeholder="Selecciona un estudiante"
              options={(students ?? []).map((s) => ({ id: s.id, label: `${s.last_name} ${s.first_name}` }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Tipo</Label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-3"
              value={type}
              onChange={(e) => setType(e.target.value as ObservationType)}
            >
              {Object.entries(OBSERVATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Contenido</Label>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
            ¿Privada? (solo visible para ti)
          </label>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar observación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
