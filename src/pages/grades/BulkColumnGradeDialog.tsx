import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { gradesApi } from '@/services/api/grades'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'
import { ConventionChips } from '@/pages/grades/conventions'
import { conventionValue, parseGradeInput } from '@/pages/grades/conventionHelpers'
import type { GradeColumn, GradeConvention, GradeSheetResponse } from '@/types/grades'

/**
 * Pone la misma nota (o la misma convención: NP, ✓…) a todos los estudiantes en
 * una actividad (columna manual).
 * Por defecto solo llena a quienes aún no tienen nota, para no pisar notas ya
 * registradas por error; reemplazar todas es una opción explícita.
 */
export function BulkColumnGradeDialog({
  open,
  onOpenChange,
  sheet,
  column,
  groupSubjectId,
  periodId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheet: GradeSheetResponse
  column: GradeColumn
  groupSubjectId: number
  periodId: number
}) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [saving, setSaving] = useState(false)

  const maxScore = Number(column.max_score)
  const parsed = parseGradeInput(value, sheet.conventions)
  const convention: GradeConvention | null = parsed.kind === 'convention' ? parsed.convention : null
  const conventionScore = convention ? conventionValue(convention) : null
  const numericValue = parsed.kind === 'score' ? parsed.value : NaN
  const isValid = convention !== null || (numericValue >= 1 && numericValue <= maxScore)

  // "Sin nota" = ni puntaje ni convención (una convención sin valor también cuenta como registrada).
  const targets = sheet.students.filter((student) => {
    const grade = sheet.grades[student.id]?.[column.id]
    const empty = !grade || ((grade.score === null || grade.score === undefined) && !grade.convention_id)
    return replaceExisting || empty
  })

  const save = async () => {
    if (!isValid || targets.length === 0) return
    setSaving(true)
    try {
      await gradesApi.bulk(
        targets.map((student) => ({
          student_id: student.id,
          grade_column_id: column.id,
          score: convention ? conventionScore : numericValue,
          convention_id: convention?.id ?? null,
        }))
      )
      toast.success(
        `${convention ? `Convención ${convention.code}` : `Nota ${numericValue.toFixed(1)}`} asignada a ${targets.length} estudiantes.`
      )
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
      setValue('')
      onOpenChange(false)
    } catch {
      toast.error('No pudimos asignar la nota.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Misma nota para todos — {column.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Nota{sheet.conventions.length > 0 ? ' o convención' : ''}</Label>
            <Input
              autoFocus
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`1.0 – ${maxScore.toFixed(1)}`}
            />
            {convention && (
              <p className="text-xs text-muted-foreground">
                {convention.label} — {conventionScore !== null ? `vale ${conventionScore.toFixed(1)}` : 'sin nota'}
              </p>
            )}
          </div>
          <ConventionChips conventions={sheet.conventions} onPick={(c) => setValue(c.code)} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
            Reemplazar también las notas ya registradas
          </label>
          <p className="text-sm text-muted-foreground">
            {targets.length === 0
              ? 'Todos los estudiantes ya tienen nota en esta actividad.'
              : `Se asignará a ${targets.length} de ${sheet.students.length} estudiantes.`}
          </p>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={!isValid || targets.length === 0 || saving}>
            {saving ? 'Guardando...' : 'Asignar nota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
