import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { gradesApi } from '@/services/api/grades'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'
import type { GradeColumn, GradeSheetResponse } from '@/types/grades'

/**
 * Pone la misma nota a todos los estudiantes en una actividad (columna manual).
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
  const numericValue = Number(value)
  const isValid = value.trim() !== '' && !Number.isNaN(numericValue) && numericValue >= 1 && numericValue <= maxScore

  const targets = sheet.students.filter((student) => {
    const score = sheet.grades[student.id]?.[column.id]?.score
    return replaceExisting || score === null || score === undefined
  })

  const save = async () => {
    if (!isValid || targets.length === 0) return
    setSaving(true)
    try {
      await gradesApi.bulk(
        targets.map((student) => ({ student_id: student.id, grade_column_id: column.id, score: numericValue }))
      )
      toast.success(`Nota ${numericValue.toFixed(1)} asignada a ${targets.length} estudiantes.`)
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
            <Label>Nota</Label>
            <Input
              autoFocus
              type="number"
              inputMode="decimal"
              step="0.1"
              min={1}
              max={maxScore}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`1.0 – ${maxScore.toFixed(1)}`}
            />
          </div>
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
