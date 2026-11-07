import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { gradeColumnsApi, gradesApi } from '@/services/api/grades'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'
import { ConventionChips } from '@/pages/grades/conventions'
import { conventionValue, parseGradeInput } from '@/pages/grades/conventionHelpers'
import type { GradeColumn, GradeConvention, GradeSheetResponse } from '@/types/grades'

/**
 * Pone la misma nota (o la misma convención: NP, ✓…) a todos los estudiantes en
 * una actividad (columna manual). También permite renombrar la actividad.
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
  const [name, setName] = useState(column.name)
  const [shortName, setShortName] = useState(column.short_name ?? '')
  const [renaming, setRenaming] = useState(false)
  const nameChanged = name.trim() !== column.name || shortName.trim() !== (column.short_name ?? '')

  const [removing, setRemoving] = useState(false)
  const section = sheet.sections.find((s) => s.columns.some((c) => c.id === column.id))
  const others = section?.columns.filter((c) => c.id !== column.id) ?? []
  const withGrades = sheet.students.filter((s) => {
    const g = sheet.grades[s.id]?.[column.id]
    return g && (g.score !== null || g.convention_id !== null)
  }).length

  /** Mismo reparto que hace el backend: en proporción a los pesos actuales, para seguir sumando igual. */
  const rescaledWeights = () => {
    const total = (section?.columns ?? []).reduce((sum, c) => sum + Number(c.weight), 0)
    const current = others.reduce((sum, c) => sum + Number(c.weight), 0)
    let assigned = 0
    return others.map((c, i) => {
      const weight =
        i === others.length - 1
          ? Math.round((total - assigned) * 10) / 10
          : Math.round((current > 0 ? (Number(c.weight) * total) / current : total / others.length) * 10) / 10
      assigned += weight
      return `${c.short_name || c.name} ${weight.toFixed(1)} %`
    })
  }

  const remove = async () => {
    const lines = [
      `¿Eliminar la actividad "${column.name}"? No se puede deshacer.`,
      withGrades > 0 ? `Se borrarán las notas de ${withGrades} ${withGrades === 1 ? 'estudiante' : 'estudiantes'}.` : '',
      others.length > 0
        ? `Los porcentajes de "${section?.name}" quedarán así: ${rescaledWeights().join(', ')}.`
        : `"${section?.name}" quedará sin actividades.`,
      'Las definitivas se recalculan solas.',
    ].filter(Boolean)
    if (!window.confirm(lines.join('\n\n'))) return
    setRemoving(true)
    try {
      await gradeColumnsApi.remove(column.id)
      toast.success(`Actividad "${column.name}" eliminada.`)
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
      queryClient.invalidateQueries({ queryKey: ['homeworks', groupSubjectId, periodId] })
      onOpenChange(false)
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(message || 'No pudimos eliminar la actividad.')
    } finally {
      setRemoving(false)
    }
  }

  const rename = async () => {
    if (!name.trim()) {
      toast.error('La actividad necesita un nombre.')
      return
    }
    setRenaming(true)
    try {
      await gradeColumnsApi.update(column.id, { name: name.trim(), short_name: shortName.trim() || null })
      toast.success('Nombre de la actividad actualizado.')
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
      // Si la actividad es la columna de una tarea, la tarea también cambia de nombre.
      queryClient.invalidateQueries({ queryKey: ['homeworks', groupSubjectId, periodId] })
    } catch {
      toast.error('No pudimos cambiar el nombre.')
    } finally {
      setRenaming(false)
    }
  }
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
          <DialogTitle>{column.name}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-md border p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Actividad</p>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Encabezado</Label>
                <Input maxLength={8} value={shortName} onChange={(e) => setShortName(e.target.value)} />
              </div>
            </div>
            {nameChanged && (
              <Button size="sm" variant="outline" className="w-fit" onClick={rename} disabled={renaming}>
                {renaming ? 'Guardando...' : 'Guardar nombre'}
              </Button>
            )}
          </div>

          <p className="text-xs font-semibold uppercase text-muted-foreground">Misma nota para todos</p>
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
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="text-destructive" onClick={remove} disabled={removing || saving}>
            <Trash2 className="h-4 w-4" /> {removing ? 'Eliminando...' : 'Eliminar actividad'}
          </Button>
          <Button onClick={save} disabled={!isValid || targets.length === 0 || saving}>
            {saving ? 'Guardando...' : 'Asignar nota'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
