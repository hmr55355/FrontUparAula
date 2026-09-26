import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { homeworksApi } from '@/services/api/homeworks'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { DUE_STATUS_LABELS, getDueStatus } from '@/types/homeworks'
import type { DueStatus, Homework } from '@/types/homeworks'
import { NewHomeworkDialog } from '@/pages/homeworks/NewHomeworkDialog'

const DUE_STATUS_BADGE: Record<DueStatus, 'success' | 'warning' | 'danger'> = {
  en_plazo: 'success',
  vence_manana: 'warning',
  vencida: 'danger',
}

export function Homeworks() {
  const { course, activeCourse } = useActiveCourseGroup()
  const { activePeriod } = useActivePeriod(course?.academic_year_id)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Homework | null>(null)

  const { data: homeworks, isLoading } = useQuery({
    queryKey: ['homeworks', course?.id, activePeriod?.id],
    queryFn: () => homeworksApi.list(course!.id, activePeriod!.id),
    enabled: !!course && !!activePeriod,
  })

  if (!course || !activePeriod) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecciona un curso activo en el encabezado para ver sus tareas.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Tareas</h1>
          <p className="text-sm text-muted-foreground">
            {activeCourse?.groupName} — {activeCourse?.subjectName}
          </p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Nueva tarea
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando tareas...</p>}

      <div className="flex flex-col gap-2">
        {!isLoading && (!homeworks || homeworks.length === 0) && (
          <p className="text-sm text-muted-foreground">Sin tareas asignadas en este período.</p>
        )}
        {homeworks?.map((homework) => {
          const dueStatus = getDueStatus(homework.due_date)
          return (
            <Link key={homework.id} to={`/homeworks/${homework.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex flex-col gap-1 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{homework.title}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant={DUE_STATUS_BADGE[dueStatus]}>{DUE_STATUS_LABELS[dueStatus]}</Badge>
                      <button
                        type="button"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Editar tarea"
                        onClick={(e) => {
                          // La tarjeta es un enlace a las entregas: el lápiz no debe navegar.
                          e.preventDefault()
                          e.stopPropagation()
                          setEditing(homework)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Entrega: {homework.due_date.slice(0, 10)}
                    {homework.is_graded && ' · Genera calificación'}
                    {homework.total_deliveries !== undefined &&
                      ` · ${homework.delivered_count ?? 0}/${homework.total_deliveries} entregadas`}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {editing && (
        <NewHomeworkDialog
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          groupSubjectId={course.id}
          periodId={activePeriod.id}
          homework={editing}
        />
      )}

      <NewHomeworkDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groupSubjectId={course.id}
        periodId={activePeriod.id}
      />
    </div>
  )
}
