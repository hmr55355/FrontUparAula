import type { ClassBlock } from '@/types'
import type { ClassScheduleBlock } from '@/types/schedule'

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

/**
 * Bloques deducidos de las clases cuando la jornada aún no tiene bloques
 * configurados (mismo criterio que el backend en ShiftController::inferBlocks):
 * cada hora de inicio/fin es un límite, los tramos con clase son bloques y los
 * huecos entre clases, descansos.
 */
export function inferBlocks(entries: ClassScheduleBlock[]): ClassBlock[] {
  const ranges = entries.map((e) => [toMinutes(e.start_time), toMinutes(e.end_time)] as const)
  const points = [...new Set(ranges.flat())].sort((a, b) => a - b)
  const blocks: ClassBlock[] = []
  let number = 1
  for (let i = 0; i < points.length - 1; i++) {
    const [start, end] = [points[i], points[i + 1]]
    const covered = ranges.some(([s, e]) => s <= start && e >= end)
    blocks.push({
      type: covered ? 'clase' : 'descanso',
      label: covered ? String(number++) : 'Descanso',
      start_time: toTime(start),
      end_time: toTime(end),
    })
  }
  return blocks
}

/**
 * Una "corrida" es una clase tal como se ve en el horario impreso: filas
 * consecutivas del mismo curso y salón (ej. 6:15–7:10 y 7:10–8:05) se unen en
 * una sola tarjeta, también si solo las separa un descanso.
 */
export interface ScheduleRun {
  entry: ClassScheduleBlock
  entries: ClassScheduleBlock[]
  start_time: string
  end_time: string
}

export function buildRuns(dayEntries: ClassScheduleBlock[], blocks: ClassBlock[]): ScheduleRun[] {
  const sorted = [...dayEntries].sort((a, b) => a.start_time.localeCompare(b.start_time))
  const breaks = blocks.filter((b) => b.type === 'descanso')
  const runs: ScheduleRun[] = []
  for (const entry of sorted) {
    const last = runs[runs.length - 1]
    const sameCourse =
      last && last.entry.group_subject_id === entry.group_subject_id && (last.entry.classroom ?? '') === (entry.classroom ?? '')
    const lastEnd = last ? toMinutes(last.end_time) : -1
    const start = toMinutes(entry.start_time)
    const contiguous =
      lastEnd === start ||
      breaks.some((b) => toMinutes(b.start_time) === lastEnd && toMinutes(b.end_time) === start)
    if (last && sameCourse && contiguous) {
      last.entries.push(entry)
      last.end_time = entry.end_time
    } else {
      runs.push({ entry, entries: [entry], start_time: entry.start_time, end_time: entry.end_time })
    }
  }
  return runs
}

export type GridCell =
  | { kind: 'break'; block: ClassBlock }
  | { kind: 'empty'; block: ClassBlock }
  | { kind: 'entry'; run: ScheduleRun; entry: ClassScheduleBlock; blocks: ClassBlock[]; continued: boolean; continues: boolean }

const overlaps = (run: { start_time: string; end_time: string }, block: ClassBlock) =>
  toMinutes(run.start_time) < toMinutes(block.end_time) && toMinutes(run.end_time) > toMinutes(block.start_time)

/**
 * Celdas de un día: una clase ocupa todos los bloques consecutivos que cubre
 * (colspan). Un descanso siempre es su propia celda, así que si una clase lo
 * atraviesa queda partida en dos tarjetas: antes y después del descanso.
 */
export function buildDayCells(blocks: ClassBlock[], dayEntries: ClassScheduleBlock[]): GridCell[] {
  const runs = buildRuns(dayEntries, blocks)
  const cells: GridCell[] = []
  let i = 0
  while (i < blocks.length) {
    const block = blocks[i]
    if (block.type === 'descanso') {
      cells.push({ kind: 'break', block })
      i++
      continue
    }

    const run = runs.find((r) => overlaps(r, block))
    if (!run) {
      cells.push({ kind: 'empty', block })
      i++
      continue
    }

    const spanned = [block]
    while (i + spanned.length < blocks.length) {
      const next = blocks[i + spanned.length]
      if (next.type !== 'clase' || !overlaps(run, next)) break
      spanned.push(next)
    }
    const after = blocks[i + spanned.length]
    // La fila a editar al tocar esta parte de la tarjeta: la que empieza en este tramo.
    const entry = run.entries.find((e) => overlaps(e, block)) ?? run.entry
    cells.push({
      kind: 'entry',
      run,
      entry,
      blocks: spanned,
      continued: toMinutes(run.start_time) < toMinutes(block.start_time),
      continues: !!after && after.type === 'descanso' && overlaps(run, after),
    })
    i += spanned.length
  }
  return cells
}
