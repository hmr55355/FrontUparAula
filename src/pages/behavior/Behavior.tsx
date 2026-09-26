import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { behaviorApi } from '@/services/api/behavior'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useAuthStore } from '@/store/authStore'
import {
  BEHAVIOR_CATEGORY_LABELS,
  BEHAVIOR_TYPE_BADGE,
  BEHAVIOR_TYPE_LABELS,
} from '@/types/behavior'
import type { BehaviorAnnotation, BehaviorCategory, BehaviorType } from '@/types/behavior'
import { NewAnnotationDialog } from '@/pages/behavior/NewAnnotationDialog'
import { NewCitationDialog } from '@/pages/citations/NewCitationDialog'

export function Behavior() {
  const { course, activeCourse } = useActiveCourseGroup()
  const groupId = course?.group_id

  const [typeFilter, setTypeFilter] = useState<BehaviorType | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<BehaviorCategory | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [followUp, setFollowUp] = useState<BehaviorAnnotation | null>(null)
  const [editing, setEditing] = useState<BehaviorAnnotation | null>(null)
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { data: institution } = useCurrentInstitution()
  // Igual que el backend: editar o borrar, solo el autor o un admin.
  const canEdit = (annotation: BehaviorAnnotation) =>
    annotation.registered_by === currentUserId || institution?.my_role === 'admin'

  const markContacted = async (annotation: BehaviorAnnotation) => {
    try {
      await behaviorApi.markContacted(annotation.id)
      toast.success('Acudiente marcado como contactado.')
      queryClient.invalidateQueries({ queryKey: ['behavior', groupId] })
      queryClient.invalidateQueries({ queryKey: ['student-profile', annotation.student_id] })
    } catch {
      toast.error('No pudimos marcar el contacto.')
    }
  }

  const { data: annotations, isLoading } = useQuery({
    queryKey: ['behavior', groupId, typeFilter, categoryFilter],
    queryFn: () =>
      behaviorApi.list({
        groupId: groupId as number,
        type: typeFilter || undefined,
        category: categoryFilter || undefined,
      }),
    enabled: !!groupId,
  })

  if (!groupId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecciona un curso activo en el encabezado para ver sus anotaciones.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Comportamiento</h1>
          <p className="text-sm text-muted-foreground">
            {activeCourse?.groupName} — {activeCourse?.subjectName}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva anotación
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className="h-10 rounded-md border border-input bg-transparent px-2 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as BehaviorType | '')}
        >
          <option value="">Todos los tipos</option>
          {Object.entries(BEHAVIOR_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-input bg-transparent px-2 text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as BehaviorCategory | '')}
        >
          <option value="">Todas las categorías</option>
          {Object.entries(BEHAVIOR_CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando anotaciones...</p>}

      <div className="flex flex-col gap-2">
        {!isLoading && (!annotations || annotations.length === 0) && (
          <p className="text-sm text-muted-foreground">Sin anotaciones en este período.</p>
        )}
        {annotations?.map((annotation) => (
          <Card key={annotation.id}>
            <CardContent className="flex flex-col gap-1 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {annotation.student?.last_name} {annotation.student?.first_name}
                  {' · '}
                  <Link to={`/student/${annotation.student_id}`} className="text-sm font-normal text-primary hover:underline">
                    Ver perfil →
                  </Link>
                </span>
                <div className="flex items-center gap-1">
                  <Badge variant={BEHAVIOR_TYPE_BADGE[annotation.type]}>{BEHAVIOR_TYPE_LABELS[annotation.type]}</Badge>
                  {canEdit(annotation) && (
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Editar anotación"
                      onClick={() => setEditing(annotation)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {BEHAVIOR_CATEGORY_LABELS[annotation.category]} · {annotation.date.slice(0, 10)}
                {annotation.teacher_name && ` · Registrado por ${annotation.teacher_name}`}
              </p>
              <p className="font-medium">{annotation.title}</p>
              <p className="text-sm text-muted-foreground">{annotation.description}</p>
              {annotation.requires_parent_contact && !annotation.parent_contacted && (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {annotation.citations_count ? (
                    <span className="text-xs text-muted-foreground">
                      📅 Citación creada — se marca como contactado al notificarla o realizarla.
                    </span>
                  ) : (
                    <Button size="sm" variant="outline" className="w-fit" onClick={() => setFollowUp(annotation)}>
                      📞 Crear citación
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="w-fit" onClick={() => markContacted(annotation)}>
                    ✅ Ya lo contacté
                  </Button>
                </div>
              )}
              {annotation.parent_contacted && (
                <p className="text-xs text-success">
                  ✅ Acudiente contactado{annotation.parent_contact_date && ` el ${annotation.parent_contact_date.slice(0, 10)}`}
                </p>
              )}
              {annotation.action_taken && (
                <p className="text-xs text-muted-foreground">Acción tomada: {annotation.action_taken}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <NewAnnotationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groupId={groupId}
        onCreated={(annotation) => {
          if (annotation.requires_parent_contact) {
            setFollowUp(annotation)
          }
        }}
      />

      {editing && (
        <NewAnnotationDialog
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          groupId={groupId}
          annotation={editing}
        />
      )}

      {followUp && (
        <NewCitationDialog
          open={!!followUp}
          onOpenChange={(open) => !open && setFollowUp(null)}
          groupId={groupId}
          presetStudentId={followUp.student_id}
          behaviorAnnotationId={followUp.id}
        />
      )}
    </div>
  )
}
