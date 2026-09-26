import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Copy, Coffee } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { scheduleApi } from '@/services/api/schedule'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { academicStructureApi } from '@/services/api/academicStructure'
import { shiftsQueryKey } from '@/pages/institution/ShiftsPanel'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useActiveShift } from '@/hooks/useActiveShift'
import { DAY_LABELS } from '@/types/schedule'
import type { ClassScheduleBlock } from '@/types/schedule'
import type { ClassBlock } from '@/types'
import { ScheduleBlockDialog } from '@/pages/schedule/ScheduleBlockDialog'
import { buildDayCells, inferBlocks, type GridCell } from '@/pages/schedule/scheduleGrid'

const ALL_DAYS = [1, 2, 3, 4, 5, 6]
const SHORT_DAY: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' }

type DialogState = { block: ClassScheduleBlock | null; day: number; start?: string; end?: string } | null

export function Schedule() {
  const queryClient = useQueryClient()
  const { data: institution } = useCurrentInstitution()
  const { data: entries, isLoading } = useQuery({ queryKey: ['schedule'], queryFn: () => scheduleApi.list() })
  const { data: courses } = useQuery({ queryKey: ['group-subjects', 'mine'], queryFn: groupSubjectsApi.myCourses })
  const { data: shifts } = useQuery({
    queryKey: shiftsQueryKey(institution?.id ?? 0),
    queryFn: () => academicStructureApi.shifts(institution!.id),
    enabled: !!institution,
    staleTime: 3 * 60 * 1000,
  })

  const [dialog, setDialog] = useState<DialogState>(null)
  const [mobileDay, setMobileDay] = useState(() => Math.min(Math.max(new Date().getDay(), 1), 6))
  const [duplicateFrom, setDuplicateFrom] = useState(1)
  const [duplicateTo, setDuplicateTo] = useState(2)

  // Jornadas en las que dicta el docente (por sus cursos); si no hay datos, todas.
  const teacherShiftIds = useMemo(() => {
    const ids = new Set((courses ?? []).map((c) => c.group?.shift_id).filter((id): id is number => !!id))
    return ids
  }, [courses])
  const visibleShifts = (shifts ?? []).filter((s) => teacherShiftIds.size === 0 || teacherShiftIds.has(s.id))
  const [shiftId, setShiftId] = useState<number | null>(null)
  // Abre en la jornada activa del docente (la del día y la hora, o la que eligió).
  const { activeShiftId } = useActiveShift()
  useEffect(() => {
    if (visibleShifts.length > 0 && (shiftId === null || !visibleShifts.some((s) => s.id === shiftId))) {
      setShiftId(visibleShifts.find((s) => s.id === activeShiftId)?.id ?? visibleShifts[0].id)
    }
  }, [visibleShifts, shiftId, activeShiftId])
  const shift = visibleShifts.find((s) => s.id === shiftId)

  const shiftEntries = (entries ?? []).filter(
    (e) => !shift || !e.group_subject?.group?.shift_id || e.group_subject.group.shift_id === shift.id
  )
  const configuredBlocks = shift?.class_blocks ?? []
  const blocks: ClassBlock[] = configuredBlocks.length > 0 ? configuredBlocks : inferBlocks(shiftEntries)
  const days = ALL_DAYS.filter((d) => d <= 5 || shiftEntries.some((e) => e.day_of_week === d))

  const cellsByDay = useMemo(() => {
    const map: Record<number, GridCell[]> = {}
    days.forEach((day) => {
      const dayEntries = shiftEntries
        .filter((e) => e.day_of_week === day)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))
      map[day] = buildDayCells(blocks, dayEntries)
    })
    return map
  }, [days, shiftEntries, blocks])

  const duplicate = useMutation({
    mutationFn: () => scheduleApi.duplicateDay(duplicateFrom, duplicateTo),
    onSuccess: () => {
      toast.success('Horario duplicado.')
      queryClient.invalidateQueries({ queryKey: ['schedule'] })
    },
    onError: () => toast.error('No pudimos duplicar el horario.'),
  })

  const openNew = (day: number, block?: ClassBlock) =>
    setDialog({ block: null, day, start: block?.start_time.slice(0, 5), end: block?.end_time.slice(0, 5) })
  const openEdit = (entry: ClassScheduleBlock) => setDialog({ block: entry, day: entry.day_of_week })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Mi horario de clases</h1>
          {visibleShifts.length > 1 ? (
            <div className="mt-1 flex gap-1">
              {visibleShifts.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShiftId(s.id)}
                  className={`rounded-full px-3 py-1 text-sm ${s.id === shiftId ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          ) : (
            shift && <p className="text-sm text-muted-foreground">{shift.name}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-md border px-2">
            <select
              className="h-9 bg-transparent text-sm"
              value={duplicateFrom}
              onChange={(e) => setDuplicateFrom(Number(e.target.value))}
            >
              {ALL_DAYS.map((d) => (
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
              {ALL_DAYS.map((d) => (
                <option key={d} value={d}>
                  {DAY_LABELS[d]}
                </option>
              ))}
            </select>
            <Button variant="ghost" size="sm" onClick={() => duplicate.mutate()} disabled={duplicate.isPending}>
              <Copy className="h-4 w-4" /> Duplicar día
            </Button>
          </div>
          <Button size="sm" onClick={() => openNew(mobileDay)}>
            <Plus className="h-4 w-4" /> Agregar clase
          </Button>
        </div>
      </div>

      {shift && configuredBlocks.length === 0 && shiftEntries.length > 0 && (
        <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
          La jornada "{shift.name}" aún no tiene sus bloques configurados; se muestran deducidos de tus clases. El
          administrador puede configurarlos en Institución → Jornadas.
        </p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Cargando horario...</p>}

      {!isLoading && blocks.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no tienes clases en el horario. Usa "Agregar clase" para empezar.
          </CardContent>
        </Card>
      )}

      {/* Escritorio: días × bloques, como el horario impreso */}
      {blocks.length > 0 && (
        <div className="hidden overflow-x-auto rounded-lg border lg:block">
          <table className="w-full table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-16" />
              {blocks.map((b, i) => (
                <col key={i} className={b.type === 'descanso' ? 'w-10' : ''} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="border-b border-r bg-card" />
                {blocks.map((b, i) =>
                  b.type === 'descanso' ? (
                    <th key={i} className="border-b border-l bg-muted/60 px-1 py-2" title={`Descanso ${b.start_time.slice(0, 5)} – ${b.end_time.slice(0, 5)}`}>
                      <Coffee className="mx-auto h-4 w-4 text-muted-foreground" />
                    </th>
                  ) : (
                    <th key={i} className="border-b border-l bg-card px-2 py-2 text-center">
                      <span className="block text-lg font-semibold">{b.label}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}
                      </span>
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {days.map((day, dayIndex) => (
                <tr key={day}>
                  <th className="border-b border-r bg-card px-2 text-2xl font-normal">{SHORT_DAY[day]}</th>
                  {cellsByDay[day]?.map((cell, i) => {
                    if (cell.kind === 'break') {
                      // Una sola celda alta por descanso para toda la semana.
                      if (dayIndex > 0) return null
                      return (
                        <td key={i} rowSpan={days.length} className="border-b border-l bg-muted/60 p-0 align-middle">
                          <span className="mx-auto block w-fit text-xs font-medium uppercase tracking-widest text-muted-foreground [writing-mode:vertical-rl]">
                            Descanso {cell.block.start_time.slice(0, 5)}–{cell.block.end_time.slice(0, 5)}
                          </span>
                        </td>
                      )
                    }
                    if (cell.kind === 'empty') {
                      return (
                        <td key={i} className="h-24 border-b border-l p-1">
                          <button
                            onClick={() => openNew(day, cell.block)}
                            className="flex h-full w-full items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:opacity-100"
                            aria-label={`Agregar clase ${DAY_LABELS[day]} bloque ${cell.block.label}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </td>
                      )
                    }
                    return (
                      <td key={i} colSpan={cell.blocks.length} className="h-24 border-b border-l p-1">
                        <EntryCard cell={cell} onClick={() => openEdit(cell.entry)} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Móvil: un día a la vez, bloque por bloque */}
      <div className="lg:hidden">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {days.map((day) => (
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
          {(cellsByDay[mobileDay] ?? []).map((cell, i) => {
            const first = cell.kind === 'entry' ? cell.blocks[0] : cell.block
            const last = cell.kind === 'entry' ? cell.blocks[cell.blocks.length - 1] : cell.block
            const time = `${first.start_time.slice(0, 5)} – ${last.end_time.slice(0, 5)}`
            if (cell.kind === 'break') {
              return (
                <div key={i} className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                  <Coffee className="h-4 w-4" /> Descanso · {time}
                </div>
              )
            }
            return (
              <div key={i} className="flex items-stretch gap-2">
                <div className="w-14 shrink-0 pt-2 text-center text-xs text-muted-foreground">
                  <span className="block text-base font-semibold text-foreground">
                    {cell.kind === 'entry' ? cell.blocks.map((b) => b.label).join('-') : cell.block.label}
                  </span>
                  {first.start_time.slice(0, 5)}
                </div>
                {cell.kind === 'entry' ? (
                  <div className="h-20 flex-1">
                    <EntryCard cell={cell} onClick={() => openEdit(cell.entry)} />
                  </div>
                ) : (
                  <button
                    onClick={() => openNew(mobileDay, cell.block)}
                    className="flex-1 rounded-md border border-dashed px-3 py-3 text-left text-sm text-muted-foreground"
                  >
                    Libre · {time}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <ScheduleBlockDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        block={dialog?.block ?? null}
        defaultDay={dialog?.day}
        defaultStart={dialog?.start}
        defaultEnd={dialog?.end}
        shifts={shifts ?? []}
      />
    </div>
  )
}

function EntryCard({ cell, onClick }: { cell: Extract<GridCell, { kind: 'entry' }>; onClick: () => void }) {
  const subject = cell.entry.group_subject?.subject
  const color = subject?.color ?? '#1565C0'
  return (
    <button
      onClick={onClick}
      className="flex h-full w-full flex-col rounded-md border-l-4 px-2 py-1 text-left transition-shadow hover:shadow-md"
      style={{ borderLeftColor: color, backgroundColor: `${color}1f` }}
    >
      <span className="flex items-start justify-between gap-2 text-[11px] font-medium uppercase">
        <span className="truncate">{subject?.name}</span>
        {cell.entry.classroom && <span className="shrink-0 text-muted-foreground">{cell.entry.classroom}</span>}
      </span>
      <span className="flex flex-1 items-center justify-center text-2xl font-normal">
        {cell.entry.group_subject?.group?.name}
      </span>
      {(cell.continued || cell.continues) && (
        <span className="text-center text-[10px] text-muted-foreground">
          {cell.continued ? '↳ continúa después del descanso' : 'sigue después del descanso →'}
        </span>
      )}
    </button>
  )
}

