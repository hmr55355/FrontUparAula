import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { observationsApi } from '@/services/api/observations'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { OBSERVATION_TYPE_LABELS } from '@/types/observations'
import type { ObservationType, StudentObservation } from '@/types/observations'
import { NewObservationDialog } from '@/pages/student/NewObservationDialog'
import { ObservationDetailDialog } from '@/pages/observations/ObservationDetailDialog'

export function Observations() {
  const { course, activeCourse } = useActiveCourseGroup()
  const groupId = course?.group_id
  const { activePeriod } = useActivePeriod(course?.academic_year_id)

  const [typeFilter, setTypeFilter] = useState<ObservationType | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<StudentObservation | null>(null)

  const { data: observations, isLoading } = useQuery({
    queryKey: ['observations', groupId, typeFilter],
    queryFn: () => observationsApi.list({ groupId: groupId as number }),
    enabled: !!groupId,
  })

  const filtered = observations?.filter((o) => !typeFilter || o.type === typeFilter)

  if (!groupId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecciona un curso activo en el encabezado para ver sus observaciones.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Observaciones</h1>
          <p className="text-sm text-muted-foreground">
            {activeCourse?.groupName} — {activeCourse?.subjectName}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva observación
        </Button>
      </div>

      <select
        className="h-10 w-fit rounded-md border border-input bg-transparent px-2 text-sm"
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value as ObservationType | '')}
      >
        <option value="">Todos los tipos</option>
        {Object.entries(OBSERVATION_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando observaciones...</p>}

      <div className="flex flex-col gap-2">
        {!isLoading && (!filtered || filtered.length === 0) && (
          <p className="text-sm text-muted-foreground">Sin observaciones registradas.</p>
        )}
        {filtered?.map((observation) => (
          <Card
            key={observation.id}
            className="cursor-pointer transition-colors hover:bg-muted/50"
            onClick={() => setSelected(observation)}
          >
            <CardContent className="flex flex-col gap-1 py-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {observation.student?.last_name} {observation.student?.first_name}
                  {' · '}
                  <Link
                    to={`/student/${observation.student_id}`}
                    className="text-sm font-normal text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver perfil →
                  </Link>
                </span>
                <div className="flex gap-1">
                  {observation.is_private && <Badge variant="secondary">Privada</Badge>}
                  <Badge>{OBSERVATION_TYPE_LABELS[observation.type]}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {observation.date.slice(0, 10)}
                {observation.teacher_name && ` · Registrado por ${observation.teacher_name}`}
              </p>
              <p className="truncate text-sm">{observation.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <NewObservationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groupId={groupId}
        periodId={activePeriod?.id}
      />

      <ObservationDetailDialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        observation={selected}
        groupId={groupId}
      />
    </div>
  )
}
