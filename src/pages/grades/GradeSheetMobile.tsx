import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getGradeColor } from '@/utils/gradeHelpers'
import { useSaveGrade } from '@/pages/grades/useSaveGrade'
import type { GradeSheetResponse } from '@/types/grades'

type View = { mode: 'list' } | { mode: 'detail'; studentId: number } | { mode: 'pick-column' } | { mode: 'quick'; columnId: number }

export function GradeSheetMobile({
  sheet,
  groupSubjectId,
  periodId,
}: {
  sheet: GradeSheetResponse
  groupSubjectId: number
  periodId: number
}) {
  const [view, setView] = useState<View>({ mode: 'list' })
  const saveGrade = useSaveGrade(groupSubjectId, periodId)

  if (view.mode === 'detail') {
    const student = sheet.students.find((s) => s.id === view.studentId)
    if (!student) return null
    return (
      <StudentDetail
        sheet={sheet}
        studentId={student.id}
        studentName={`${student.first_name} ${student.last_name}`}
        onBack={() => setView({ mode: 'list' })}
        onSave={(columnId, score) => saveGrade.mutate({ studentId: student.id, columnId, score })}
      />
    )
  }

  if (view.mode === 'pick-column') {
    return (
      <div className="flex flex-col gap-2 lg:hidden">
        <Button variant="ghost" className="w-fit" onClick={() => setView({ mode: 'list' })}>
          <ChevronLeft className="h-4 w-4" /> Volver
        </Button>
        <h2 className="text-base font-semibold">¿Qué actividad quieres calificar?</h2>
        {sheet.sections.map((section) => (
          <div key={section.id}>
            <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{section.name}</p>
            <div className="flex flex-col gap-1">
              {section.columns
                .filter((c) => c.column_type === 'manual')
                .map((column) => (
                  <button
                    key={column.id}
                    onClick={() => setView({ mode: 'quick', columnId: column.id })}
                    className="rounded-md border px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    {column.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (view.mode === 'quick') {
    return (
      <QuickGradeMode
        sheet={sheet}
        columnId={view.columnId}
        onBack={() => setView({ mode: 'list' })}
        onSave={(studentId, score) => saveGrade.mutate({ studentId, columnId: view.columnId, score })}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <Button onClick={() => setView({ mode: 'pick-column' })}>✏️ Calificar actividad</Button>
      <div className="flex flex-col gap-2">
        {sheet.students.map((student) => {
          const periodFinal = sheet.period_finals[student.id]?.period_final
          const numeric = periodFinal === null || periodFinal === undefined ? null : Number(periodFinal)
          const { background, text } = getGradeColor(numeric, sheet.min_passing_grade)
          return (
            <button
              key={student.id}
              onClick={() => setView({ mode: 'detail', studentId: student.id })}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left"
            >
              <span className="font-medium">
                {student.last_name} {student.first_name}
              </span>
              <span
                className="rounded-md px-2 py-1 text-sm font-semibold"
                style={{ backgroundColor: background, color: text }}
              >
                {numeric !== null ? numeric.toFixed(1) : '—'}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function StudentDetail({
  sheet,
  studentId,
  studentName,
  onBack,
  onSave,
}: {
  sheet: GradeSheetResponse
  studentId: number
  studentName: string
  onBack: () => void
  onSave: (columnId: number, score: number | null) => void
}) {
  return (
    <div className="flex flex-col gap-3 lg:hidden">
      <Button variant="ghost" className="w-fit" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" /> Volver
      </Button>
      <h2 className="text-base font-semibold">{studentName}</h2>

      {sheet.sections.map((section) => {
        const sectionFinal = sheet.section_finals[studentId]?.[section.id]?.section_final
        return (
          <Card key={section.id}>
            <CardContent className="flex flex-col gap-2 py-4">
              <p className="text-sm font-semibold" style={{ color: section.color }}>
                {section.name}
              </p>
              {section.columns.map((column) => {
                const grade = sheet.grades[studentId]?.[column.id]
                const numeric = grade?.score === null || grade?.score === undefined ? null : Number(grade.score)
                return (
                  <MobileGradeRow
                    key={column.id}
                    label={column.name}
                    score={numeric}
                    minPassing={sheet.min_passing_grade}
                    readOnly={column.column_type !== 'manual'}
                    onSave={(value) => onSave(column.id, value)}
                  />
                )
              })}
              {section.has_section_final && (
                <MobileGradeRow
                  label={section.section_final_label}
                  score={sectionFinal ? Number(sectionFinal) : null}
                  minPassing={sheet.min_passing_grade}
                  readOnly
                  bold
                />
              )}
            </CardContent>
          </Card>
        )
      })}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center justify-between py-4">
          <span className="font-semibold">Def Total</span>
          <span className="text-lg font-bold">
            {sheet.period_finals[studentId]?.period_final
              ? Number(sheet.period_finals[studentId].period_final).toFixed(1)
              : '—'}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}

function MobileGradeRow({
  label,
  score,
  minPassing,
  readOnly,
  bold,
  onSave,
}: {
  label: string
  score: number | null
  minPassing: number
  readOnly?: boolean
  bold?: boolean
  onSave?: (value: number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(score === null ? '' : String(score))
  const { background, text } = getGradeColor(score, minPassing)

  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-sm ${bold ? 'font-semibold' : ''}`}>{label}</span>
      {editing ? (
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          step="0.1"
          className="w-20 rounded-md bg-background px-2 py-1 text-center text-foreground ring-2 ring-inset ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false)
            const value = draft.trim() === '' ? null : Number(draft)
            onSave?.(Number.isNaN(value as number) ? null : value)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') setEditing(false)
          }}
        />
      ) : (
        <button
          disabled={readOnly}
          onClick={() => {
            setDraft(score === null ? '' : String(score))
            setEditing(true)
          }}
          className="w-20 rounded-md px-2 py-1 text-center font-medium"
          style={{ backgroundColor: background, color: text }}
        >
          {score !== null ? score.toFixed(1) : '—'}
        </button>
      )}
    </div>
  )
}

function QuickGradeMode({
  sheet,
  columnId,
  onBack,
  onSave,
}: {
  sheet: GradeSheetResponse
  columnId: number
  onBack: () => void
  onSave: (studentId: number, score: number | null) => void
}) {
  const [index, setIndex] = useState(0)
  const [draft, setDraft] = useState('')
  const [savedCount, setSavedCount] = useState(0)
  const [finished, setFinished] = useState(false)

  const student = sheet.students[index]
  const column = sheet.sections.flatMap((s) => s.columns).find((c) => c.id === columnId)

  if (finished) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center lg:hidden">
        <p className="text-lg font-semibold">¡Listo!</p>
        <p className="text-sm text-muted-foreground">
          Se registraron {savedCount} notas. {sheet.students.length - savedCount} estudiantes sin calificar.
        </p>
        <Button onClick={onBack}>Volver a la planilla</Button>
      </div>
    )
  }

  if (!student || !column) return null

  const commitAndAdvance = () => {
    const trimmed = draft.trim()
    if (trimmed !== '') {
      onSave(student.id, Number(trimmed))
      setSavedCount((c) => c + 1)
    }
    setDraft('')
    if (index + 1 >= sheet.students.length) {
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <div className="flex flex-col gap-4 lg:hidden">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> Salir
        </Button>
        <span className="text-sm text-muted-foreground">
          {index + 1} / {sheet.students.length}
        </span>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8">
          <p className="text-xs uppercase text-muted-foreground">{column.name}</p>
          <p className="text-xl font-semibold">
            {student.last_name} {student.first_name}
          </p>
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="0.0"
            className="w-32 rounded-md border-2 border-primary px-3 py-3 text-center text-2xl [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitAndAdvance()}
          />
          <Button size="lg" className="w-full" onClick={commitAndAdvance}>
            Guardar y siguiente <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
