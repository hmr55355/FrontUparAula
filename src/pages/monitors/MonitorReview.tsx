import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { ChevronLeft } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { monitorsApi } from '@/services/api/monitors'
import { getAttendanceColor } from '@/utils/attendanceHelpers'
import { ATTENDANCE_LABELS, type AttendanceStatus } from '@/types/attendance'
import {
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_TYPE_LABELS,
  type AttendancePayload,
  type BehaviorPayload,
  type ParticipationPayload,
} from '@/types/monitors'

function StatusChip({ status }: { status: AttendanceStatus | null | undefined }) {
  const { background, text } = getAttendanceColor(status ?? null)
  return (
    <span className="rounded px-2 py-1 text-xs font-semibold" style={{ backgroundColor: background, color: text }}>
      {status ? ATTENDANCE_LABELS[status] : 'Sin registro'}
    </span>
  )
}

/**
 * Revisión de un envío del monitor (a esta pantalla lleva la notificación):
 * muestra exactamente qué cambiaría y deja aprobarlo o rechazarlo.
 */
export function MonitorReview() {
  const { submissionId } = useParams<{ submissionId: string }>()
  const id = Number(submissionId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [rejectNotes, setRejectNotes] = useState('')
  const [working, setWorking] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['monitor-submissions', 'detail', id],
    queryFn: () => monitorsApi.submission(id),
    enabled: !!id,
  })

  const act = async (action: 'approve' | 'reject') => {
    setWorking(true)
    try {
      if (action === 'approve') await monitorsApi.approve(id)
      else await monitorsApi.reject(id, rejectNotes || undefined)
      toast.success(action === 'approve' ? 'Aprobado: ya quedó registrado.' : 'Rechazado.')
      queryClient.invalidateQueries({ queryKey: ['monitor-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['grades-sheet'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-sheet'] })
      queryClient.invalidateQueries({ queryKey: ['participations'] })
      navigate('/monitors')
    } catch (error) {
      toast.error((axios.isAxiosError(error) && error.response?.data?.message) || 'No pudimos completar la acción.')
    } finally {
      setWorking(false)
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>
  if (isError || !data) return <p className="text-sm text-muted-foreground">No encontramos este envío.</p>

  const { data: submission, students, current_attendance: current } = data
  const name = (studentId: number) => {
    const s = students[studentId]
    return s ? `${s.last_name} ${s.first_name}` : `Estudiante #${studentId}`
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Button variant="ghost" className="w-fit" asChild>
        <Link to="/monitors">
          <ChevronLeft className="h-4 w-4" /> Monitores
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {SUBMISSION_TYPE_LABELS[submission.type]}
            <Badge variant={submission.status === 'pending' ? 'warning' : submission.status === 'approved' ? 'success' : 'danger'}>
              {SUBMISSION_STATUS_LABELS[submission.status]}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {submission.submitter?.name} · {submission.group_subject?.group?.name} — {submission.group_subject?.subject?.name} ·{' '}
            {submission.payload.date}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {submission.type === 'attendance' && (
            <div className="flex flex-col gap-1">
              <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-1 text-xs font-medium uppercase text-muted-foreground">
                <span>Estudiante</span>
                <span>Actual</span>
                <span>Propuesto</span>
              </div>
              {(submission.payload as AttendancePayload).records.map((record) => {
                const changed = current[record.student_id] !== record.status
                return (
                  <div
                    key={record.student_id}
                    className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded px-1 py-1 text-sm ${changed ? 'bg-primary/5' : ''}`}
                  >
                    <span>{name(record.student_id)}</span>
                    <StatusChip status={current[record.student_id]} />
                    <StatusChip status={record.status} />
                  </div>
                )
              })}
            </div>
          )}

          {submission.type === 'behavior' && (() => {
            const payload = submission.payload as BehaviorPayload
            return (
              <div className="flex flex-col gap-2 text-sm">
                <p>
                  <strong>{name(payload.student_id)}</strong> —{' '}
                  <Badge variant={payload.type === 'positiva' ? 'success' : 'danger'}>
                    {payload.type === 'positiva' ? 'Punto positivo' : 'Punto negativo'}
                  </Badge>
                </p>
                <p className="rounded-md bg-muted/50 p-3">{payload.observation}</p>
              </div>
            )
          })()}

          {submission.type === 'participation' &&
            (submission.payload as ParticipationPayload).entries.map((entry) => (
              <div key={entry.student_id} className="flex justify-between text-sm">
                <span>{name(entry.student_id)}</span>
                <span className="font-semibold">+{entry.points}</span>
              </div>
            ))}

          {submission.review_notes && <p className="text-sm text-muted-foreground">Nota: {submission.review_notes}</p>}

          {submission.status === 'pending' && (
            <div className="flex flex-col gap-2 border-t pt-3">
              <Input
                placeholder="Motivo del rechazo (opcional, lo verá el monitor)"
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => act('approve')} disabled={working}>
                  Aprobar
                </Button>
                <Button variant="outline" className="text-destructive" onClick={() => act('reject')} disabled={working}>
                  Rechazar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
