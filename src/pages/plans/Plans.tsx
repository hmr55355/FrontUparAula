import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { classPlansApi } from '@/services/api/classPlans'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { CLASS_PLAN_STATUS_BADGE, CLASS_PLAN_STATUS_DOT, CLASS_PLAN_STATUS_LABELS } from '@/types/classPlans'
import type { ClassPlan } from '@/types/classPlans'
import { ClassPlanDialog } from '@/pages/plans/ClassPlanDialog'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function monthRange(monthDate: Date) {
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) }
}

export function Plans() {
  const { course } = useActiveCourseGroup()
  const groupSubjectId = course?.id
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [from, setFrom] = useState(daysAgo(30))
  const [to, setTo] = useState(daysAgo(0))
  const [month, setMonth] = useState(new Date())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<ClassPlan | null>(null)
  const [createDate, setCreateDate] = useState<string | undefined>(undefined)

  const { data: listPlans, isLoading } = useQuery({
    queryKey: ['class-plans', groupSubjectId, from, to],
    queryFn: () => classPlansApi.list(groupSubjectId as number, from, to),
    enabled: !!groupSubjectId,
  })

  const { from: monthFrom, to: monthTo } = monthRange(month)
  const { data: calendarPlans } = useQuery({
    queryKey: ['class-plans', groupSubjectId, monthFrom, monthTo],
    queryFn: () => classPlansApi.list(groupSubjectId as number, monthFrom, monthTo),
    enabled: !!groupSubjectId && view === 'calendar',
  })

  useEffect(() => {
    const openId = searchParams.get('open')
    if (openId && listPlans) {
      const plan = listPlans.find((p) => p.id === Number(openId))
      if (plan) {
        setEditingPlan(plan)
        setDialogOpen(true)
      }
      searchParams.delete('open')
      setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listPlans])

  const markExecuted = async (plan: ClassPlan) => {
    try {
      await classPlansApi.updateStatus(plan.id, 'ejecutada')
      toast.success('Marcada como ejecutada.')
      queryClient.invalidateQueries({ queryKey: ['class-plans', groupSubjectId] })
    } catch {
      toast.error('No pudimos actualizar el estado.')
    }
  }

  const calendarDays = useMemo(() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1)
    const firstWeekday = start.getDay()
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    const cells: Array<{ date: string; plan?: ClassPlan } | null> = []
    for (let i = 0; i < firstWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(month.getFullYear(), month.getMonth(), d).toISOString().slice(0, 10)
      const plan = calendarPlans?.find((p) => p.date.slice(0, 10) === dateStr)
      cells.push({ date: dateStr, plan })
    }
    return cells
  }, [month, calendarPlans])

  if (!groupSubjectId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecciona un curso activo en el encabezado para ver su bitácora.
        </CardContent>
      </Card>
    )
  }

  const openCreate = (dateOverride?: string) => {
    setEditingPlan(null)
    setCreateDate(dateOverride)
    setDialogOpen(true)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Planeación y bitácora</h1>
        <div className="flex gap-2">
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
            Lista
          </Button>
          <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setView('calendar')}>
            Calendario
          </Button>
          <Button size="sm" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> Nueva planeación
          </Button>
        </div>
      </div>

      {view === 'list' && (
        <>
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span className="text-sm text-muted-foreground">a</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Cargando bitácora...</p>}

          <div className="flex flex-col gap-2">
            {!isLoading && (!listPlans || listPlans.length === 0) && (
              <p className="text-sm text-muted-foreground">Sin planeaciones registradas en este rango.</p>
            )}
            {listPlans?.map((plan) => (
              <Card
                key={plan.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => {
                  setEditingPlan(plan)
                  setDialogOpen(true)
                }}
              >
                <CardContent className="flex flex-col gap-1 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {plan.date.slice(0, 10)} — {plan.topic}
                    </span>
                    <Badge variant={CLASS_PLAN_STATUS_BADGE[plan.status]}>{CLASS_PLAN_STATUS_LABELS[plan.status]}</Badge>
                  </div>
                  {plan.pending_for_next_class && (
                    <p className="text-sm text-muted-foreground">Pendiente: {plan.pending_for_next_class}</p>
                  )}
                  {plan.status === 'planeada' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 w-fit"
                      onClick={(e) => {
                        e.stopPropagation()
                        markExecuted(plan)
                      }}
                    >
                      Marcar ejecutada
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {view === 'calendar' && (
        <Card>
          <CardContent className="py-4">
            <div className="mb-3 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">
                {month.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
                <div key={d} className="font-semibold text-muted-foreground">
                  {d}
                </div>
              ))}
              {calendarDays.map((cell, i) =>
                cell ? (
                  <button
                    key={cell.date}
                    onClick={() => {
                      if (cell.plan) {
                        setEditingPlan(cell.plan)
                        setDialogOpen(true)
                      } else {
                        openCreate(cell.date)
                      }
                    }}
                    className="flex h-12 flex-col items-center justify-center gap-1 rounded-md border border-transparent hover:border-input"
                  >
                    <span>{Number(cell.date.slice(8, 10))}</span>
                    {cell.plan && (
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: CLASS_PLAN_STATUS_DOT[cell.plan.status] }}
                      />
                    )}
                  </button>
                ) : (
                  <div key={`empty-${i}`} />
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <ClassPlanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        groupSubjectId={groupSubjectId}
        plan={editingPlan}
        initialDate={createDate}
      />
    </div>
  )
}
