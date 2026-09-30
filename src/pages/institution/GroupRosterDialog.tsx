import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { studentsApi } from '@/services/api/students'
import { StudentFormDialog } from '@/pages/student/StudentFormDialog'
import { localDateString } from '@/utils/dateHelpers'
import type { Group } from '@/types'
import type { Enrollment, Student } from '@/types/students'

type Action = { kind: 'withdraw' | 'transfer' | 'enroll'; enrollment: Enrollment } | null

const STATUS_LABEL = { activo: 'Activo', retirado: 'Retirado', trasladado: 'Trasladado' } as const

function errorText(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  const data = error.response?.data
  return (data?.errors ? (Object.values(data.errors)[0] as string[])[0] : data?.message) || fallback
}

/**
 * Estudiantes de un grupo (solo admin): matricular uno nuevo, editar datos,
 * trasladar a otro grupo del mismo año, retirar y volver a matricular. Nada se
 * borra: los retirados y trasladados quedan listados con su fecha y motivo.
 */
export function GroupRosterDialog({
  open,
  onOpenChange,
  group,
  groups,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: Group
  groups: Group[]
}) {
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Student | null>(null)
  const [action, setAction] = useState<Action>(null)
  const [date, setDate] = useState(localDateString())
  const [reason, setReason] = useState('')
  const [targetGroupId, setTargetGroupId] = useState<number | ''>('')
  const [saving, setSaving] = useState(false)

  const { data: enrollments } = useQuery({
    queryKey: ['group-enrollments', group.id],
    queryFn: () => studentsApi.enrollments(group.id),
    enabled: open,
  })
  const active = enrollments?.filter((e) => e.status === 'activo') ?? []
  const inactive = enrollments?.filter((e) => e.status !== 'activo') ?? []
  const transferTargets = groups.filter((g) => g.id !== group.id && g.academic_year_id === group.academic_year_id)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['group-enrollments'] })
    queryClient.invalidateQueries({ queryKey: ['groups'] })
    queryClient.invalidateQueries({ queryKey: ['group-students'] })
    queryClient.invalidateQueries({ queryKey: ['grades-sheet'] })
    queryClient.invalidateQueries({ queryKey: ['student-profile'] })
  }

  const openAction = (kind: NonNullable<Action>['kind'], enrollment: Enrollment) => {
    setAction({ kind, enrollment })
    setDate(localDateString())
    setReason('')
    setTargetGroupId('')
  }

  const run = async () => {
    if (!action) return
    const { kind, enrollment } = action
    const name = `${enrollment.student.first_name} ${enrollment.student.last_name}`
    setSaving(true)
    try {
      if (kind === 'withdraw') {
        await studentsApi.withdraw(enrollment.student_id, {
          group_id: group.id,
          withdrawal_date: date,
          withdrawal_reason: reason.trim() || undefined,
        })
        toast.success(`${name} quedó retirado. Sus notas y registros se conservan.`)
      } else if (kind === 'transfer') {
        if (!targetGroupId) {
          toast.error('Elige el grupo de destino.')
          return
        }
        await studentsApi.transfer(enrollment.student_id, {
          from_group_id: group.id,
          to_group_id: targetGroupId,
          date,
          reason: reason.trim() || undefined,
        })
        toast.success(`${name} trasladado a ${groups.find((g) => g.id === targetGroupId)?.name}.`)
      } else {
        await studentsApi.enroll(enrollment.student_id, { group_id: group.id, enrollment_date: date })
        toast.success(`${name} volvió a quedar matriculado en ${group.name}.`)
      }
      setAction(null)
      refresh()
    } catch (error) {
      toast.error(errorText(error, 'No pudimos completar la acción.'))
    } finally {
      setSaving(false)
    }
  }

  const actionForm = (enrollment: Enrollment) =>
    action?.enrollment.id === enrollment.id && (
      <div className="mt-2 flex flex-col gap-2 rounded-md border bg-muted/30 p-2">
        <div className="flex flex-wrap items-end gap-2">
          {action.kind === 'transfer' && (
            <div className="space-y-1">
              <Label className="text-xs">Grupo de destino</Label>
              <select
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={targetGroupId}
                onChange={(e) => setTargetGroupId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Selecciona...</option>
                {transferTargets.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Fecha</Label>
            <Input type="date" className="h-9 w-40" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {action.kind !== 'enroll' && (
            <div className="min-w-[10rem] flex-1 space-y-1">
              <Label className="text-xs">Motivo (opcional)</Label>
              <Input className="h-9" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={run} disabled={saving}>
            {saving
              ? 'Guardando...'
              : action.kind === 'withdraw'
                ? 'Confirmar retiro'
                : action.kind === 'transfer'
                  ? 'Confirmar traslado'
                  : 'Matricular de nuevo'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAction(null)} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Estudiantes de {group.name}</DialogTitle>
        </DialogHeader>

        <Button size="sm" className="w-fit" onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4" /> Matricular estudiante
        </Button>

        {!enrollments && <p className="text-sm text-muted-foreground">Cargando...</p>}
        <p className="text-xs font-semibold uppercase text-muted-foreground">Activos ({active.length})</p>
        <div className="flex flex-col gap-1">
          {active.map((e) => (
            <div key={e.id} className="rounded-md border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/student/${e.student_id}`} className="font-medium hover:underline" onClick={() => onOpenChange(false)}>
                  {e.student.last_name} {e.student.first_name}
                  {e.student.document_number && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {e.student.document_type} {e.student.document_number}
                    </span>
                  )}
                </Link>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(e.student)}>
                    Editar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openAction('transfer', e)} disabled={transferTargets.length === 0}>
                    Trasladar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => openAction('withdraw', e)}>
                    Retirar
                  </Button>
                </div>
              </div>
              {actionForm(e)}
            </div>
          ))}
        </div>

        {inactive.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase text-muted-foreground">Retirados y trasladados ({inactive.length})</p>
            <div className="flex flex-col gap-1">
              {inactive.map((e) => (
                <div key={e.id} className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {e.student.last_name} {e.student.first_name}{' '}
                      <Badge variant="secondary">{STATUS_LABEL[e.status]}</Badge>
                      <span className="ml-2 text-xs">
                        {e.withdrawal_date?.slice(0, 10)}
                        {e.withdrawal_reason && ` · ${e.withdrawal_reason}`}
                      </span>
                    </span>
                    {e.status === 'retirado' && (
                      <Button size="sm" variant="ghost" onClick={() => openAction('enroll', e)}>
                        Volver a matricular
                      </Button>
                    )}
                  </div>
                  {actionForm(e)}
                </div>
              ))}
            </div>
          </>
        )}

        {creating && (
          <StudentFormDialog open onOpenChange={setCreating} groupId={group.id} groupName={group.name} onSaved={refresh} />
        )}
        {editing && (
          <StudentFormDialog
            key={editing.id}
            open
            onOpenChange={(o) => !o && setEditing(null)}
            student={editing}
            onSaved={refresh}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
