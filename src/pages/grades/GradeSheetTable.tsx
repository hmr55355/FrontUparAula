import { Fragment, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'

import { getGradeColor } from '@/utils/gradeHelpers'
import { useSaveGrade } from '@/pages/grades/useSaveGrade'
import { AdjustFinalDialog } from '@/pages/grades/AdjustFinalDialog'
import { BulkColumnGradeDialog } from '@/pages/grades/BulkColumnGradeDialog'
import type { GradeColumn, GradeSheetResponse } from '@/types/grades'
import { ListChecks } from 'lucide-react'

type AdjustTarget = { type: 'section' | 'period'; id: number; label: string; currentValue: number | null }

export function GradeSheetTable({
  sheet,
  groupSubjectId,
  periodId,
}: {
  sheet: GradeSheetResponse
  groupSubjectId: number
  periodId: number
}) {
  const saveGrade = useSaveGrade(groupSubjectId, periodId)
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null)
  const [bulkColumn, setBulkColumn] = useState<GradeColumn | null>(null)

  return (
    <>
    <div className="hidden overflow-x-auto rounded-lg border lg:block">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th rowSpan={2} className="sticky left-0 z-10 min-w-[140px] border-b border-r bg-card px-3 py-2 text-left">
              Apellidos
            </th>
            <th rowSpan={2} className="sticky left-[140px] z-10 min-w-[140px] border-b border-r bg-card px-3 py-2 text-left">
              Nombres
            </th>
            {sheet.sections.map((section) => (
              <th
                key={section.id}
                colSpan={section.columns.length + (section.has_section_final ? 1 : 0)}
                className="border-b border-l px-3 py-2 text-center text-white"
                style={{ backgroundColor: section.color }}
              >
                {section.name} ({Number(section.weight)}%)
              </th>
            ))}
            <th rowSpan={2} className="border-b border-l bg-muted px-3 py-2 text-center font-semibold">
              Def Total
            </th>
          </tr>
          <tr>
            {sheet.sections.map((section) => (
              <Fragment key={section.id}>
                {section.columns.map((column) => (
                  <th key={column.id} className="min-w-[72px] border-b border-l px-2 py-2 text-center font-medium">
                    {column.column_type === 'manual' ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 rounded px-1 hover:bg-muted"
                        title="Poner la misma nota a todos en esta actividad"
                        onClick={() => setBulkColumn(column)}
                      >
                        {column.short_name || column.name}
                        <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ) : (
                      column.short_name || column.name
                    )}
                  </th>
                ))}
                {section.has_section_final && (
                  <th className="min-w-[72px] border-b border-l bg-muted px-2 py-2 text-center font-medium">
                    {section.section_final_label}
                  </th>
                )}
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.students.map((student) => {
            const periodFinalRow = sheet.period_finals[student.id]
            const studentName = `${student.first_name} ${student.last_name}`
            return (
              <tr key={student.id} className="hover:bg-muted/30">
                <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2 font-medium">
                  {student.last_name}
                </td>
                <td className="sticky left-[140px] z-10 border-b border-r bg-card px-3 py-2">{student.first_name}</td>
                {sheet.sections.map((section) => {
                  const sectionFinalRow = sheet.section_finals[student.id]?.[section.id]
                  return (
                    <Fragment key={section.id}>
                      {section.columns.map((column) => {
                        const grade = sheet.grades[student.id]?.[column.id];
                        const isComputed = column.column_type !== 'manual'
                        return (
                          <td key={column.id} className="border-b border-l p-0 text-center">
                            <EditableGradeCell
                              score={grade?.score ?? null}
                              minPassing={sheet.min_passing_grade}
                              readOnly={isComputed}
                              onSave={(value) =>
                                saveGrade.mutate({ studentId: student.id, columnId: column.id, score: value })
                              }
                            />
                          </td>
                        )
                      })}
                      {section.has_section_final && (
                        <ReadOnlyCell
                          score={sectionFinalRow?.section_final ?? null}
                          minPassing={sheet.min_passing_grade}
                          highlight
                          adjusted={sectionFinalRow?.manually_adjusted}
                          onClick={
                            sectionFinalRow
                              ? () =>
                                  setAdjustTarget({
                                    type: 'section',
                                    id: sectionFinalRow.id,
                                    label: `${studentName} — ${section.section_final_label}`,
                                    currentValue:
                                      sectionFinalRow.section_final === null ? null : Number(sectionFinalRow.section_final),
                                  })
                              : undefined
                          }
                        />
                      )}
                    </Fragment>
                  )
                })}
                <ReadOnlyCell
                  score={periodFinalRow?.period_final ?? null}
                  minPassing={sheet.min_passing_grade}
                  highlight
                  bold
                  adjusted={periodFinalRow?.manually_adjusted}
                  onClick={
                    periodFinalRow
                      ? () =>
                          setAdjustTarget({
                            type: 'period',
                            id: periodFinalRow.id,
                            label: `${studentName} — Def Total`,
                            currentValue: periodFinalRow.period_final === null ? null : Number(periodFinalRow.period_final),
                          })
                      : undefined
                  }
                />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>

    {bulkColumn && (
      <BulkColumnGradeDialog
        open
        onOpenChange={(open) => !open && setBulkColumn(null)}
        sheet={sheet}
        column={bulkColumn}
        groupSubjectId={groupSubjectId}
        periodId={periodId}
      />
    )}

    {adjustTarget && (
      <AdjustFinalDialog
        open
        onOpenChange={(open) => !open && setAdjustTarget(null)}
        type={adjustTarget.type}
        id={adjustTarget.id}
        label={adjustTarget.label}
        currentValue={adjustTarget.currentValue}
        groupSubjectId={groupSubjectId}
        periodId={periodId}
      />
    )}
    </>
  )
}

function ReadOnlyCell({
  score,
  minPassing,
  highlight,
  bold,
  adjusted,
  onClick,
}: {
  score: string | number | null
  minPassing: number
  highlight?: boolean
  bold?: boolean
  adjusted?: boolean
  onClick?: () => void
}) {
  const numeric = score === null ? null : Number(score)
  const { background, text } = getGradeColor(numeric, minPassing)
  const content = numeric !== null ? numeric.toFixed(1) : '—'

  if (onClick) {
    return (
      <td className={`border-b border-l p-0 text-center ${bold ? 'font-semibold' : ''} ${highlight ? '' : ''}`}>
        <button
          type="button"
          onClick={onClick}
          className="block w-full px-2 py-2 hover:ring-2 hover:ring-inset hover:ring-primary"
          style={{ backgroundColor: background, color: text }}
          title={adjusted ? 'Ajustada manualmente — clic para modificar' : 'Clic para ajustar manualmente'}
        >
          {content}
          {adjusted && <span className="ml-1 text-xs">✎</span>}
        </button>
      </td>
    )
  }

  return (
    <td
      className={`border-b border-l px-2 py-2 text-center ${bold ? 'font-semibold' : ''} ${highlight ? '' : ''}`}
      style={{ backgroundColor: background, color: text }}
    >
      {content}
    </td>
  )
}

function EditableGradeCell({
  score,
  minPassing,
  readOnly,
  onSave,
}: {
  score: string | number | null
  minPassing: number
  readOnly: boolean
  onSave: (value: number | null) => void
}) {
  const [editing, setEditing] = useState(false);
  const lockedWidthRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const numeric = score === null ? null : Number(score)
  const [draft, setDraft] = useState(numeric === null ? '' : String(numeric))
  const { background, text } = getGradeColor(numeric, minPassing)

  // El <input> nativo aporta un ancho "preferido" intrínseco al algoritmo de layout "auto"
  // de la tabla que ninguna combinación de width/max-width/contain en el propio input (ni
  // en un <div> envolvente) logra suprimir — el navegador igual ensancha la columna. La
  // única forma confiable de evitarlo es fijar el width directamente en el <td>, ya que el
  // ancho especificado de una celda sí es una entrada de primera clase para ese algoritmo.
  useLayoutEffect(() => {
    const td = inputRef.current?.closest('td')
    if (!editing || !td || lockedWidthRef.current === null) return
    td.style.width = `${lockedWidthRef.current}px`
    return () => {
      td.style.width = ''
    }
  }, [editing])

  if (readOnly) {
    return (
      <div className="px-2 py-2" style={{ backgroundColor: background, color: text }}>
        {numeric !== null ? numeric.toFixed(1) : '—'}
      </div>
    )
  }

  if (!editing) {
    return (
      <button
        type="button"
        className="block w-full px-2 py-2 hover:ring-2 hover:ring-inset hover:ring-primary"
        style={{ backgroundColor: background, color: text }}
        onClick={(e) => {
          lockedWidthRef.current = e.currentTarget.offsetWidth
          setDraft(numeric === null ? '' : String(numeric))
          setEditing(true)
        }}
      >
        {numeric !== null ? numeric.toFixed(1) : '—'}
      </button>
    )
  }

  const commit = () => {
    setEditing(false)
    const trimmed = draft.trim()
    const value = trimmed === '' ? null : Number(trimmed)
    if (value !== numeric) {
      onSave(Number.isNaN(value as number) ? null : value)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      commit()
    } else if (e.key === 'Escape') {
      setEditing(false)
    }
  }

  return (
    <input
      ref={inputRef}
      autoFocus
      type="number"
      inputMode="decimal"
      step="0.1"
      className="block w-full bg-background px-2 py-2 text-center text-foreground outline-none ring-2 ring-inset ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}
