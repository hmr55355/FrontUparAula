import { useEffect, useState } from 'react'
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
import { parentsApi } from '@/services/api/parents'
import { citationsApi } from '@/services/api/citations'
import { CITATION_TYPE_LABELS } from '@/types/citations'
import type { CitationType, NotificationMethod, ParentCitation } from '@/types/citations'
import { wallClockInputValue } from '@/utils/dateHelpers'
import { RELATIONSHIP_LABELS } from '@/types/parents'
import type { ParentRelationship } from '@/types/parents'

/**
 * Crear una citación, o con `citation` editarla/reprogramarla y eliminarla (el
 * backend solo deja al autor o a un admin). El estudiante no cambia al editar.
 */
export function NewCitationDialog({
  open,
  onOpenChange,
  groupId,
  presetStudentId,
  behaviorAnnotationId,
  citation,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  presetStudentId?: number
  behaviorAnnotationId?: number
  citation?: ParentCitation
}) {
  const isEdit = !!citation
  const queryClient = useQueryClient()
  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => groupsApi.students(groupId),
  })

  const [studentId, setStudentId] = useState<number | ''>(presetStudentId ?? '')
  const [parentId, setParentId] = useState<number | ''>('')
  const [citationType, setCitationType] = useState<CitationType>('comportamiento')
  const [reason, setReason] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [location, setLocation] = useState('')
  const [notificationMethod, setNotificationMethod] = useState<NotificationMethod>('whatsapp')
  const [saving, setSaving] = useState(false)

  const [addingParent, setAddingParent] = useState(false)
  const [newParent, setNewParent] = useState({ first_name: '', last_name: '', relationship: 'madre' as ParentRelationship, phone: '' })

  const { data: parents, refetch: refetchParents } = useQuery({
    queryKey: ['parents', studentId],
    queryFn: () => parentsApi.list(studentId as number),
    enabled: !!studentId,
  })

  useEffect(() => {
    if (open) {
      setStudentId(citation?.student_id ?? presetStudentId ?? '')
      setParentId(citation?.parent_id ?? '')
      setCitationType(citation?.citation_type ?? 'comportamiento')
      setReason(citation?.reason ?? '')
      setScheduledDate(wallClockInputValue(citation?.scheduled_date))
      setLocation(citation?.location ?? '')
      setNotificationMethod(citation?.notification_method ?? 'whatsapp')
      setAddingParent(false)
    }
  }, [open, presetStudentId, citation])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['citations', groupId] })
    queryClient.invalidateQueries({ queryKey: ['behavior', groupId] })
    if (studentId) queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] })
  }

  const errorText = (error: unknown, fallback: string) =>
    (axios.isAxiosError(error) && error.response?.data?.message) || fallback

  const remove = async () => {
    if (!citation || !window.confirm('¿Eliminar esta citación?')) return
    setSaving(true)
    try {
      await citationsApi.remove(citation.id)
      toast.success('Citación eliminada.')
      invalidate()
      onOpenChange(false)
    } catch (error) {
      toast.error(errorText(error, 'No pudimos eliminar la citación.'))
    } finally {
      setSaving(false)
    }
  }

  const saveParent = async () => {
    if (!studentId || !newParent.first_name || !newParent.phone) {
      toast.error('Completa el nombre y teléfono del acudiente.')
      return
    }
    try {
      const parent = await parentsApi.create({ student_id: studentId, ...newParent })
      toast.success('Acudiente agregado.')
      setParentId(parent.id)
      setAddingParent(false)
      refetchParents()
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] })
    } catch {
      toast.error('No pudimos agregar el acudiente.')
    }
  }

  const save = async () => {
    if (!studentId || !reason) {
      toast.error('Selecciona el estudiante y escribe el motivo.')
      return
    }
    setSaving(true)
    if (citation) {
      try {
        await citationsApi.update(citation.id, {
          parent_id: parentId || null,
          citation_type: citationType,
          reason,
          scheduled_date: scheduledDate || undefined,
          location: location || undefined,
          notification_method: notificationMethod,
        })
        // Cambiar la fecha de una citación ya notificada/confirmada (o a la que no
        // asistieron) es reprogramarla: el estado lo refleja.
        const rescheduled =
          scheduledDate !== wallClockInputValue(citation.scheduled_date) &&
          ['notificado', 'confirmado', 'no_asistio'].includes(citation.status)
        if (rescheduled) {
          await citationsApi.updateStatus(citation.id, { status: 'reprogramado' })
        }
        toast.success(rescheduled ? 'Citación reprogramada.' : 'Citación actualizada.')
        invalidate()
        onOpenChange(false)
      } catch (error) {
        toast.error(errorText(error, 'No pudimos actualizar la citación.'))
      } finally {
        setSaving(false)
      }
      return
    }
    try {
      await citationsApi.create({
        student_id: studentId,
        parent_id: parentId || null,
        group_id: groupId,
        behavior_annotation_id: behaviorAnnotationId,
        citation_type: citationType,
        reason,
        scheduled_date: scheduledDate || undefined,
        location: location || undefined,
        notification_method: notificationMethod,
      })
      toast.success('Citación creada.')
      invalidate()
      onOpenChange(false)
    } catch {
      toast.error('No pudimos crear la citación.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar citación' : 'Nueva citación'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Estudiante</Label>
            <SearchableSelect
              value={studentId}
              onChange={setStudentId}
              disabled={!!presetStudentId || isEdit}
              placeholder="Selecciona un estudiante"
              options={(students ?? []).map((s) => ({ id: s.id, label: `${s.last_name} ${s.first_name}` }))}
            />
          </div>

          {studentId && (
            <div className="space-y-1">
              <Label>Acudiente</Label>
              {!addingParent ? (
                <div className="flex gap-2">
                  <select
                    className="h-12 w-full rounded-md border border-input bg-transparent px-3"
                    value={parentId}
                    onChange={(e) => setParentId(Number(e.target.value))}
                  >
                    <option value="">Sin acudiente específico</option>
                    {parents?.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} — {p.phone}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" onClick={() => setAddingParent(true)}>
                    + Agregar
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 rounded-md border p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Nombre"
                      value={newParent.first_name}
                      onChange={(e) => setNewParent((p) => ({ ...p, first_name: e.target.value }))}
                    />
                    <Input
                      placeholder="Apellido"
                      value={newParent.last_name}
                      onChange={(e) => setNewParent((p) => ({ ...p, last_name: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-10 rounded-md border border-input bg-transparent px-2"
                      value={newParent.relationship}
                      onChange={(e) => setNewParent((p) => ({ ...p, relationship: e.target.value as ParentRelationship }))}
                    >
                      {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Input
                      placeholder="Teléfono"
                      value={newParent.phone}
                      onChange={(e) => setNewParent((p) => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAddingParent(false)}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={saveParent}>
                      Guardar acudiente
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Tipo</Label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-3"
              value={citationType}
              onChange={(e) => setCitationType(e.target.value as CitationType)}
            >
              {Object.entries(CITATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Motivo</Label>
            <textarea
              className="min-h-[70px] w-full rounded-md border border-input bg-transparent px-3 py-2"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha y hora programada</Label>
              <Input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Lugar</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Coordinación" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Método de notificación</Label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-3"
              value={notificationMethod}
              onChange={(e) => setNotificationMethod(e.target.value as NotificationMethod)}
            >
              <option value="celular">Celular</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="correo">Correo</option>
              <option value="agenda">Agenda del estudiante</option>
              <option value="otro">Otro</option>
            </select>
          </div>
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
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar citación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
