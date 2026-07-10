import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Copy, Pencil, Trash2, MapPin, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { scheduleApi } from '@/services/api/schedule'
import { DAY_LABELS } from '@/types/schedule'
import type { ClassScheduleBlock } from '@/types/schedule'
import { ScheduleBlockDialog } from '@/pages/schedule/ScheduleBlockDialog'

const DAYS = [1, 2, 3, 4, 5, 6]

export function Schedule() {
  const queryClient = useQueryClient()
  const { data: blocks, isLoading } = useQuery({ queryKey: ['schedule'], queryFn: () => scheduleApi.list() })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBlock, setEditingBlock] = useState<ClassScheduleBlock | null>(null)
  const [mobileDay, setMobileDay] = useState(() => Math.min(Math.max(new Date().getDay(), 1), 6))
  const [duplicateFrom, setDuplicateFrom] = useState(1)
  const [duplicateTo, setDuplicateTo] = useState(2)

  const remove = useMutation({
    mutationFn: (id: number) => scheduleApi.remove(id),
    onSuccess: () => {
      toast.success('Bloque eliminado.')
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
    },
  })

  const duplicate = useMutation({
    mutationFn: () => scheduleApi.duplicateDay(duplicateFrom, duplicateTo),
    onSuccess: () => {
      toast.success('Horario duplicado.')
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
    },
    onError: () => toast.error('No pudimos duplicar el horario.'),
  })

  const openNew = (day?: number) => {
    setEditingBlock(null)
    setMobileDay(day ?? mobileDay)
    setDialogOpen(true)
  }

  const openEdit = (block: ClassScheduleBlock) => {
    setEditingBlock(block)
    setDialogOpen(true)
  }

  const blocksByDay = (day: number) => (blocks ?? []).filter((b) => b.day_of_week === day)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Mi horario de clases</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-md border px-2">
            <select
              className="h-9 bg-transparent text-sm"
              value={duplicateFrom}
              onChange={(e) => setDuplicateFrom(Number(e.target.value))}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">→</span>
            <select
              className="h-9 bg-transparent text-sm"
              value={duplicateTo}
              onChange={(e) => setDuplicateTo(Number(e.target.value))}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={() => duplicate.mutate()} disabled={duplicate.isPending}>
              <Copy className="h-4 w-4" /> Duplicar día
            </Button>
          </div>
          <Button size="sm" onClick={() => openNew()}>
            <Plus className="h-4 w-4" /> Agregar bloque
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando horario...</p>}

      {/* Desktop: 6 columnas */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-6">
        {DAYS.map((day) => (
          <div key={day} className="flex flex-col gap-2">
            <p className="text-center text-sm font-semibold">{DAY_LABELS[day]}</p>
            {blocksByDay(day).length === 0 && (
              <button
                onClick={() => openNew(day)}
                className="rounded-md border border-dashed p-3 text-xs text-muted-foreground hover:bg-muted"
              >
                Sin clases
              </button>
            )}
            {blocksByDay(day).map((block) => (
              <ScheduleBlockCard key={block.id} block={block} onEdit={openEdit} onDelete={(id) => remove.mutate(id)} />
            ))}
          </div>
        ))}
      </div>

      {/* Móvil: tabs de día */}
      <div className="lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setMobileDay(day)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                mobileDay === day ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {blocksByDay(mobileDay).length === 0 && (
            <Card>
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Sin clases este día.
              </CardContent>
            </Card>
          )}
          {blocksByDay(mobileDay).map((block) => (
            <ScheduleBlockCard key={block.id} block={block} onEdit={openEdit} onDelete={(id) => remove.mutate(id)} />
          ))}
        </div>
      </div>

      <ScheduleBlockDialog open={dialogOpen} onOpenChange={setDialogOpen} block={editingBlock} defaultDay={mobileDay} />
    </div>
  )
}

function ScheduleBlockCard({
  block,
  onEdit,
  onDelete,
}: {
  block: ClassScheduleBlock
  onEdit: (block: ClassScheduleBlock) => void
  onDelete: (id: number) => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-3">
        <div className="flex items-center justify-between">
          <p className="font-medium">
            {block.group_subject?.group?.name} {block.group_subject?.subject?.name}
          </p>
          <div className="flex gap-1">
            <button onClick={() => onEdit(block)} className="text-muted-foreground hover:text-foreground">
              <Pencil className="h-4 w-4" />
            </button>
            <button onClick={() => onDelete(block.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {block.start_time.slice(0, 5)} - {block.end_time.slice(0, 5)}
          {block.block_label && ` · ${block.block_label}`}
        </p>
        {block.classroom && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {block.classroom}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
