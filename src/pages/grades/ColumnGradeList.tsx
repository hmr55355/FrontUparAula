import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { ConventionChips } from '@/pages/grades/conventions'
import { gradeCellDisplay, inputFromConvention, parseGradeInput, type GradeInput } from '@/pages/grades/conventionHelpers'
import { cn } from '@/lib/utils'
import type { GradeColumn, GradeSheetResponse, GradeSheetStudent } from '@/types/grades'

type NameMode = 'last' | 'first' | 'full'

const NAME_MODES: { key: NameMode; label: string }[] = [
  { key: 'last', label: 'Apellidos' },
  { key: 'first', label: 'Nombres' },
  { key: 'full', label: 'Completo' },
]

const NAME_MODE_KEY = 'uparaula-column-list-names'

function readNameMode(): NameMode {
  try {
    const saved = localStorage.getItem(NAME_MODE_KEY)
    return saved === 'first' || saved === 'full' ? saved : 'last'
  } catch {
    return 'last'
  }
}

/**
 * Nombre corto para la lista. Si dos estudiantes quedan iguales (hermanos, apellidos
 * repetidos), se les agrega la inicial de lo que falta para distinguirlos.
 */
function shortNames(students: GradeSheetStudent[], mode: NameMode): Map<number, string> {
  const base = (s: GradeSheetStudent) =>
    mode === 'last' ? s.last_name : mode === 'first' ? s.first_name : `${s.last_name} ${s.first_name}`
  const counts = new Map<string, number>()
  students.forEach((s) => counts.set(base(s), (counts.get(base(s)) ?? 0) + 1))
  return new Map(
    students.map((s) => {
      const name = base(s)
      if (mode === 'full' || (counts.get(name) ?? 0) < 2) return [s.id, name]
      const other = mode === 'last' ? s.first_name : s.last_name
      return [s.id, `${name} ${other.charAt(0)}.`]
    })
  )
}

/**
 * Una actividad con todos los estudiantes en lista (móvil): se ve de un vistazo quién
 * tiene nota y se califica tocando la casilla. Enter guarda y pasa al siguiente.
 */
export function ColumnGradeList({
  sheet,
  columnId,
  columns,
  locked = false,
  onChangeColumn,
  onBack,
  onSave,
}: {
  sheet: GradeSheetResponse
  columnId: number
  /** Actividades entre las que se puede saltar con las flechas. */
  columns: GradeColumn[]
  locked?: boolean
  onChangeColumn: (columnId: number) => void
  onBack: () => void
  onSave: (studentId: number, input: GradeInput) => void
}) {
  const [nameMode, setNameMode] = useState<NameMode>(readNameMode)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')

  const names = useMemo(() => shortNames(sheet.students, nameMode), [sheet.students, nameMode])
  const columnIndex = columns.findIndex((c) => c.id === columnId)
  const column = columns[columnIndex]
  if (!column) return null

  const gradeOf = (studentId: number) => sheet.grades[studentId]?.[column.id]
  const graded = sheet.students.filter((s) => {
    const g = gradeOf(s.id)
    return g && (g.score !== null || g.convention_id !== null)
  }).length

  const changeNameMode = (mode: NameMode) => {
    setNameMode(mode)
    try {
      localStorage.setItem(NAME_MODE_KEY, mode)
    } catch {
      // Sin almacenamiento solo se pierde la preferencia.
    }
  }

  const startEditing = (studentId: number) => {
    const grade = gradeOf(studentId)
    setDraft(grade && grade.convention_id === null && grade.score !== null ? String(Number(grade.score)) : '')
    setEditingId(studentId)
  }

  /** Guarda lo escrito. Devuelve false si no es una nota válida (se queda en la casilla). */
  const commit = (studentId: number): boolean => {
    const grade = gradeOf(studentId)
    const parsed = parseGradeInput(draft, sheet.conventions)
    if (parsed.kind === 'invalid') {
      toast.error(`"${draft.trim()}" no es una nota válida.`)
      return false
    }
    if (parsed.kind === 'convention') {
      onSave(studentId, inputFromConvention(parsed.convention))
      return true
    }
    const value = parsed.kind === 'score' ? parsed.value : null
    const current = grade?.score === null || grade?.score === undefined ? null : Number(grade.score)
    const hasConvention = grade?.convention_id != null
    // Con convención y el campo vacío no se toca: para quitarla se escribe una nota.
    if (hasConvention && value === null) return true
    if (value !== current || hasConvention) onSave(studentId, { score: value, conventionId: null })
    return true
  }

  const next = (studentId: number) => {
    const i = sheet.students.findIndex((s) => s.id === studentId)
    const following = sheet.students[i + 1]
    if (following) startEditing(following.id)
    else setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <Button variant="ghost" className="w-fit" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" /> Volver
      </Button>

      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="outline"
          aria-label="Actividad anterior"
          disabled={columnIndex <= 0}
          onClick={() => onChangeColumn(columns[columnIndex - 1].id)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-semibold">{column.name}</p>
          <p className="text-xs text-muted-foreground">
            {graded} de {sheet.students.length} con nota
          </p>
        </div>
        <Button
          size="icon"
          variant="outline"
          aria-label="Actividad siguiente"
          disabled={columnIndex >= columns.length - 1}
          onClick={() => onChangeColumn(columns[columnIndex + 1].id)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-1 text-xs">
        <span className="text-muted-foreground">Mostrar:</span>
        {NAME_MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => changeNameMode(m.key)}
            className={cn(
              'rounded-full border px-2.5 py-0.5',
              nameMode === m.key ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="divide-y rounded-lg border bg-card">
        {sheet.students.map((student, i) => {
          const grade = gradeOf(student.id)
          const score = grade?.score === null || grade?.score === undefined ? null : Number(grade.score)
          const display = gradeCellDisplay(grade ?? { score, convention_id: null }, sheet.conventions, sheet.min_passing_grade)
          const editing = editingId === student.id
          return (
            <div key={student.id} className={cn('px-3 py-1.5', editing && 'bg-primary/5')}>
              <div className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm" title={`${student.last_name} ${student.first_name}`}>
                  {names.get(student.id)}
                </span>
                {editing ? (
                  <input
                    autoFocus
                    type="text"
                    inputMode="decimal"
                    enterKeyHint="next"
                    aria-label={`Nota de ${student.last_name} ${student.first_name}`}
                    placeholder={display.convention?.code}
                    className="h-9 w-16 rounded-md bg-background px-2 text-center text-foreground ring-2 ring-inset ring-primary"
                    value={draft}
                    // La nota que ya tenía queda seleccionada: al escribir se reemplaza.
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => {
                      // Al tocar una convención el input pierde el foco antes del clic:
                      // ConventionChips evita eso con onMouseDown, así que aquí solo se guarda.
                      if (editingId === student.id && commit(student.id)) setEditingId(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (commit(student.id)) next(student.id)
                      }
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    disabled={locked}
                    aria-label={`Nota de ${student.last_name} ${student.first_name}`}
                    onClick={() => startEditing(student.id)}
                    className="h-9 w-16 shrink-0 rounded-md text-center text-sm font-medium"
                    style={{ backgroundColor: display.colors.background, color: display.colors.text }}
                  >
                    {display.content}
                  </button>
                )}
              </div>
              {editing && sheet.conventions.length > 0 && (
                <div className="mt-1.5 pl-8">
                  <ConventionChips
                    conventions={sheet.conventions}
                    onPick={(c) => {
                      onSave(student.id, inputFromConvention(c))
                      next(student.id)
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
