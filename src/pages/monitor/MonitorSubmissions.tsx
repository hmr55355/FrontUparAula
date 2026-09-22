import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { monitorAppApi } from '@/services/api/monitorApp'
import { SUBMISSION_STATUS_LABELS, SUBMISSION_TYPE_LABELS, type MonitorSubmission } from '@/types/monitors'

export function submissionSummary(submission: MonitorSubmission): string {
  const payload = submission.payload as { records?: unknown[]; entries?: Array<{ points: number }>; type?: string }
  if (submission.type === 'attendance') return `${payload.records?.length ?? 0} estudiantes`
  if (submission.type === 'participation')
    return `${payload.entries?.reduce((sum, e) => sum + e.points, 0) ?? 0} participaciones`
  return payload.type === 'positiva' ? 'Punto positivo' : 'Punto negativo'
}

const STATUS_VARIANT = { pending: 'warning', approved: 'success', rejected: 'danger' } as const

/** Lo que el monitor ha enviado y cómo va cada envío. */
export function MonitorSubmissions() {
  const queryClient = useQueryClient()
  const { data: submissions, isLoading } = useQuery({ queryKey: ['monitor', 'submissions'], queryFn: monitorAppApi.submissions })

  const cancel = async (id: number) => {
    if (!window.confirm('¿Cancelar este envío?')) return
    try {
      await monitorAppApi.cancel(id)
      toast.success('Envío cancelado.')
      queryClient.invalidateQueries({ queryKey: ['monitor'] })
    } catch {
      toast.error('No pudimos cancelarlo.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold">Mis envíos</h1>
      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {submissions?.length === 0 && <p className="text-sm text-muted-foreground">Aún no has enviado nada.</p>}
      {submissions?.map((s) => (
        <Card key={s.id}>
          <CardContent className="flex flex-col gap-1 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{SUBMISSION_TYPE_LABELS[s.type]}</span>
              <Badge variant={STATUS_VARIANT[s.status]}>{SUBMISSION_STATUS_LABELS[s.status]}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">{(s.payload as { date: string }).date}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {s.group_subject?.group?.name} — {s.group_subject?.subject?.name} · {submissionSummary(s)}
            </p>
            {s.review_notes && <p className="text-sm">Nota del docente: {s.review_notes}</p>}
            {s.status === 'pending' && (
              <Button variant="ghost" size="sm" className="w-fit text-destructive" onClick={() => cancel(s.id)}>
                Cancelar envío
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
