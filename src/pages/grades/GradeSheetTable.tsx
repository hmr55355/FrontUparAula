import { Fragment, useState, type KeyboardEvent } from 'react'

import { getGradeColor } from '@/utils/gradeHelpers'
import { useSaveGrade } from '@/pages/grades/useSaveGrade'
import type { GradeSheetResponse } from '@/types/grades'

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

  return (
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
                    {column.short_name ?? column.name}
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
            const periodFinal = sheet.period_finals[student.id]?.period_final
            return (
              <tr key={student.id} className="hover:bg-muted/30">
                <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2 font-medium">
                  {student.last_name}
                </td>
                <td className="sticky left-[140px] z-10 border-b border-r bg-card px-3 py-2">{student.first_name}</td>
                {sheet.sections.map((section) => {
                  const sectionFinal = sheet.section_finals[student.id]?.[section.id]?.section_final
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
                        <ReadOnlyCell score={sectionFinal ?? null} minPassing={sheet.min_passing_grade} highlight />
                      )}
                    </Fragment>
                  )
                })}
                <ReadOnlyCell score={periodFinal ?? null} minPassing={sheet.min_passing_grade} highlight bold />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ReadOnlyCell({
  score,
  minPassing,
  highlight,
  bold,
}: {
  score: string | number | null
  minPassing: number
  highlight?: boolean
  bold?: boolean
}) {
  const numeric = score === null ? null : Number(score)
  const { background, text } = getGradeColor(numeric, minPassing)

  return (
    <td
      className={`border-b border-l px-2 py-2 text-center ${bold ? 'font-semibold' : ''} ${highlight ? '' : ''}`}
      style={{ backgroundColor: background, color: text }}
    >
      {numeric !== null ? numeric.toFixed(1) : '—'}
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
  const numeric = score === null ? null : Number(score)
  const [draft, setDraft] = useState(numeric === null ? '' : String(numeric))
  const { background, text } = getGradeColor(numeric, minPassing)

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
        onClick={() => {
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
      autoFocus
      type="number"
      inputMode="decimal"
      step="0.1"
      className="w-full border-2 border-primary px-2 py-2 text-center outline-none"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
    />
  )
}
