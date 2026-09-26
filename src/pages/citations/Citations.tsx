import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Pencil, Plus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { citationsApi } from '@/services/api/citations'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import {
  CITATION_STATUS_BADGE,
  CITATION_STATUS_LABELS,
  CITATION_TYPE_LABELS,
} from '@/types/citations'
import type { CitationStatus, ParentCitation } from '@/types/citations'
import { NewCitationDialog } from '@/pages/citations/NewCitationDialog'
import { formatWallClock } from '@/utils/dateHelpers'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useAuthStore } from '@/store/authStore'

export function Citations() {
  const { course, activeCourse } = useActiveCourseGroup()
  const groupId = course?.group_id
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<CitationStatus | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [completing, setCompleting] = useState<ParentCitation | null>(null)
  const [editing, setEditing] = useState<ParentCitation | null>(null)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { data: institution } = useCurrentInstitution()
  // Igual que el backend: editar o borrar, solo el autor o un admin.
  const canEdit = (citation: ParentCitation) =>
    citation.registered_by === currentUserId || institution?.my_role === 'admin'

  const { data: citations, isLoading } = useQuery({
    queryKey: ['citations', groupId, statusFilter],
    queryFn: () => citationsApi.list({ groupId: groupId as number, status: statusFilter || undefined }),
    enabled: !!groupId,
  })

  const setStatus = async (citation: ParentCitation, status: CitationStatus) => {
    try {
      await citationsApi.updateStatus(citation.id, { status });
      toast.success('Estado actualizado.')
      queryClient.invalidateQueries({ queryKey: ['citations', groupId] })
      // Notificar/confirmar una citación marca como contactado al acudiente de su anotación.
      queryClient.invalidateQueries({ queryKey: ['behavior', groupId] })
    } catch {
      toast.error('No pudimos actualizar el estado.')
    }
  }

  if (!groupId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecciona un curso activo en el encabezado para ver sus citaciones.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Citaciones a padres</h1>
          <p className="text-sm text-muted-foreground">
            {activeCourse?.groupName} — {activeCourse?.subjectName}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva citación
        </Button>
      </div>

      <select
        className="h-10 w-fit rounded-md border border-input bg-transparent px-2 text-sm"
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as CitationStatus | '')}
      >
        <option value="">Todos los estados</option>
        {Object.entries(CITATION_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando citaciones...</p>}

      <div className="flex flex-col gap-2">
        {!isLoading && (!citations || citations.length === 0) && (
          <p className="text-sm text-muted-foreground">Sin citaciones pendientes ✅</p>
        )}
        {citations?.map((citation) => (
          <Card key={citation.id}>
            <CardContent className="flex flex-col gap-1 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {citation.student?.last_name} {citation.student?.first_name}
                  {citation.parent && ` · ${citation.parent.first_name} ${citation.parent.last_name}`}
                  {' · '}
                  <Link to={`/student/${citation.student_id}`} className="text-sm font-normal text-primary hover:underline">
                    Ver perfil →
                  </Link>
                </span>
                <div className="flex items-center gap-1">
                  <Badge variant={CITATION_STATUS_BADGE[citation.status]}>{CITATION_STATUS_LABELS[citation.status]}</Badge>
                  {canEdit(citation) && (
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Editar citación"
                      onClick={() => setEditing(citation)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {CITATION_TYPE_LABELS[citation.citation_type]}
                {citation.scheduled_date && ` · ${formatWallClock(citation.scheduled_date)}`}
                {citation.location && ` · ${citation.location}`}
              </p>
              <p className="text-sm">{citation.reason}</p>

              {completing?.id === citation.id ? (
                <MarkRealizadoForm
                  citation={citation}
                  onCancel={() => setCompleting(null)}
                  onSaved={() => {
                    setCompleting(null)
                    queryClient.invalidateQueries({ queryKey: ['citations', groupId] })
                    queryClient.invalidateQueries({ queryKey: ['behavior', groupId] })
                  }}
                />
              ) : (
                citation.status !== 'realizado' && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setStatus(citation, 'notificado')}>
                      Notificado
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setStatus(citation, 'confirmado')}>
                      Confirmado
                    </Button>
                    <Button size="sm" onClick={() => setCompleting(citation)}>
                      Marcar realizado
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(citation, 'no_asistio')}>
                      No asistió
                    </Button>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <NewCitationDialog open={dialogOpen} onOpenChange={setDialogOpen} groupId={groupId} />
      {editing && (
        <NewCitationDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          groupId={groupId}
          citation={editing}
        />
      )}
    </div>
  )
}

function MarkRealizadoForm({
  citation,
  onCancel,
  onSaved,
}: {
  citation: ParentCitation
  onCancel: () => void
  onSaved: () => void
}) {
  const [outcome, setOutcome] = useState('')
  const [commitments, setCommitments] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!outcome) {
      toast.error('Describe el resultado de la reunión.')
      return
    }
    setSaving(true)
    try {
      await citationsApi.updateStatus(citation.id, { status: 'realizado', outcome, commitments })
      toast.success('Citación marcada como realizada.')
      onSaved()
    } catch {
      toast.error('No pudimos guardar el resultado.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-1 flex flex-col gap-2 rounded-md border p-2">
      <Input placeholder="Resultado de la reunión" value={outcome} onChange={(e) => setOutcome(e.target.value)} />
      <Input placeholder="Compromisos adquiridos" value={commitments} onChange={(e) => setCommitments(e.target.value)} />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={save} disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>
    </div>
  )
}
