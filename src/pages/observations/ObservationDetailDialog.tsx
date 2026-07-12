import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { observationsApi } from '@/services/api/observations'
import { OBSERVATION_TYPE_LABELS } from '@/types/observations'
import type { ObservationType, StudentObservation } from '@/types/observations'
import { useAuthStore } from '@/store/authStore'

export function ObservationDetailDialog({
  open,
  onOpenChange,
  observation,
  groupId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  observation: StudentObservation | null
  groupId: number
}) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState<ObservationType>('seguimiento')
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (observation) {
      setType(observation.type)
      setContent(observation.content)
      setIsPrivate(observation.is_private)
      setEditing(false)
    }
  }, [observation])

  if (!observation) return null

  const isOwner = observation.registered_by === currentUser?.id

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['observations', groupId] })
    queryClient.invalidateQueries({ queryKey: ['student-profile', observation.student_id] })
  }

  const save = async () => {
    setSaving(true)
    try {
      await observationsApi.update(observation.id, { type, content, is_private: isPrivate })
      toast.success('Observación actualizada.')
      invalidate()
      onOpenChange(false)
    } catch {
      toast.error('No pudimos actualizar la observación.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('¿Eliminar esta observación? Esta acción no se puede deshacer.')) return
    setSaving(true)
    try {
      await observationsApi.remove(observation.id)
      toast.success('Observación eliminada.')
      invalidate()
      onOpenChange(false)
    } catch {
      toast.error('No pudimos eliminar la observación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {observation.student?.last_name} {observation.student?.first_name}
          </DialogTitle>
        </DialogHeader>

        {!editing ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{OBSERVATION_TYPE_LABELS[observation.type]}</Badge>
              {observation.is_private && <Badge variant="secondary">Privada</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {observation.date.slice(0, 10)}
              {observation.teacher_name && ` · Registrado por ${observation.teacher_name}`}
            </p>
            <p className="whitespace-pre-wrap text-sm">{observation.content}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
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
            <textarea
              className="min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              ¿Privada? (solo visible para ti)
            </label>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {isOwner && !editing && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={remove} disabled={saving}>
                Eliminar
              </Button>
            </div>
          )}
          {editing ? (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
