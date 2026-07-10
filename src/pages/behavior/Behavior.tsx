import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { behaviorApi } from '@/services/api/behavior'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import {
  BEHAVIOR_CATEGORY_LABELS,
  BEHAVIOR_TYPE_BADGE,
  BEHAVIOR_TYPE_LABELS,
} from '@/types/behavior'
import type { BehaviorAnnotation, BehaviorCategory, BehaviorType } from '@/types/behavior'
import { NewAnnotationDialog } from '@/pages/behavior/NewAnnotationDialog'
import { NewCitationDialog } from '@/pages/citations/NewCitationDialog'

export function Behavior() {
  const { course } = useActiveCourseGroup()
  const groupId = course?.group_id

  const [typeFilter, setTypeFilter] = useState<BehaviorType | ''>('')
  const [categoryFilter, setCategoryFilter] = useState<BehaviorCategory | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [followUp, setFollowUp] = useState<BehaviorAnnotation | null>(null)

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
        <h1 className="text-xl font-semibold">Comportamiento</h1>
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
                <Badge variant={BEHAVIOR_TYPE_BADGE[annotation.type]}>{BEHAVIOR_TYPE_LABELS[annotation.type]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {BEHAVIOR_CATEGORY_LABELS[annotation.category]} · {annotation.date.slice(0, 10)}
                {annotation.teacher_name && ` · Registrado por ${annotation.teacher_name}`}
              </p>
              <p className="font-medium">{annotation.title}</p>
              <p className="text-sm text-muted-foreground">{annotation.description}</p>
              {annotation.requires_parent_contact && !annotation.parent_contacted && (
                <Button size="sm" variant="outline" className="mt-1 w-fit" onClick={() => setFollowUp(annotation)}>
                  📞 Crear citación
                </Button>
              )}
              {annotation.parent_contacted && (
                <p className="text-xs text-success">✅ Padre contactado</p>
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
