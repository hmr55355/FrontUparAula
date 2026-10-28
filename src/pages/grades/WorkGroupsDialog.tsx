import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Shuffle, Trash2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { workGroupsApi } from '@/services/api/grades'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'
import { conventionTitle, parseGradeInput } from '@/pages/grades/conventionHelpers'
import { workGroupsOf } from '@/pages/grades/workGroupHelpers'
import type { GradeColumn, GradeSheetResponse, GradeSheetStudent, WorkGroup, WorkGroupDraft } from '@/types/grades'

interface DraftGroup {
  key: string
  id?: number
  name: string
  studentIds: number[]
  /** Lo que escribe el docente: una nota o la abreviatura de una convención. */
  grade: string
}

let draftKey = 0
const nextKey = () => `new-${++draftKey}`

function gradeText(group: WorkGroup, sheet: GradeSheetResponse) {
  if (group.convention_id) return sheet.conventions.find((c) => c.id === group.convention_id)?.code ?? ''
  return group.score === null ? '' : Number(group.score).toFixed(1)
}

/**
 * Grupos de trabajo de una actividad (columna manual). La nota del grupo se copia
 * a la de cada integrante al guardar; el backend solo la reescribe a todos cuando
 * cambia, así que una nota cambiada a mano a un integrante se respeta.
 */
export function WorkGroupsDialog({
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
  const [groups, setGroups] = useState<DraftGroup[]>(() =>
    workGroupsOf(sheet, column.id).map((g) => ({
      key: `id-${g.id}`,
      id: g.id,
      name: g.name,
      studentIds: g.student_ids,
      grade: gradeText(g, sheet),
    }))
  )
  const [activeKey, setActiveKey] = useState<string | null>(groups[0]?.key ?? null)
  const [groupSize, setGroupSize] = useState('4')
  const [saving, setSaving] = useState(false)
  const maxScore = Number(column.max_score)

  const studentsById = useMemo(() => new Map(sheet.students.map((s) => [s.id, s])), [sheet.students])
  const grouped = new Set(groups.flatMap((g) => g.studentIds))
  const ungrouped = sheet.students.filter((s) => !grouped.has(s.id))

  // Otras actividades del curso que ya tienen grupos, para reutilizarlos.
  const copySources = sheet.sections
    .flatMap((section) => section.columns)
    .filter((c) => c.id !== column.id && workGroupsOf(sheet, c.id).length > 0)

  const update = (key: string, change: Partial<DraftGroup>) =>
    setGroups((current) => current.map((g) => (g.key === key ? { ...g, ...change } : g)))

  const addGroup = () => {
    const key = nextKey()
    setGroups((current) => [...current, { key, name: `Grupo ${current.length + 1}`, studentIds: [], grade: '' }])
    setActiveKey(key)
  }

  const removeGroup = (key: string) => {
    setGroups((current) => current.filter((g) => g.key !== key))
    if (activeKey === key) setActiveKey(null)
  }

  const addToActive = (studentId: number) => {
    if (!activeKey) {
      toast.info('Primero elige o crea el grupo al que vas a agregar estudiantes.')
      return
    }
    setGroups((current) =>
      current.map((g) => (g.key === activeKey ? { ...g, studentIds: [...g.studentIds, studentId] } : g))
    )
  }

  const removeMember = (key: string, studentId: number) =>
    setGroups((current) =>
      current.map((g) => (g.key === key ? { ...g, studentIds: g.studentIds.filter((id) => id !== studentId) } : g))
    )

  /** Reparte al azar a quienes aún no tienen grupo, en grupos nuevos del tamaño elegido. */
  const shuffleUngrouped = () => {
    const size = Math.floor(Number(groupSize))
    if (!size || size < 1) {
      toast.error('Escribe cuántos estudiantes van por grupo.')
      return
    }
    const pool = ungrouped.map((s) => s.id)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    setGroups((current) => {
      const created: DraftGroup[] = []
      for (let i = 0; i < pool.length; i += size) {
        created.push({
          key: nextKey(),
          name: `Grupo ${current.length + created.length + 1}`,
          studentIds: pool.slice(i, i + size),
          grade: '',
        })
      }
      return [...current, ...created]
    })
  }

  /** Mismos grupos (nombres e integrantes) que otra actividad, sin sus notas. */
  const copyFrom = (sourceColumnId: number) => {
    const source = workGroupsOf(sheet, sourceColumnId)
    // Los grupos que ya existían en esta actividad conservan su id (por orden) para no perder su nota.
    setGroups((current) =>
      source.map((g, index) => ({
        key: current[index]?.key ?? nextKey(),
        id: current[index]?.id,
        name: g.name,
        studentIds: g.student_ids.filter((id) => studentsById.has(id)),
        grade: current[index]?.grade ?? '',
      }))
    )
    toast.success('Grupos copiados. Revisa y guarda.')
  }

  const save = async () => {
    const payload: WorkGroupDraft[] = []
    for (const group of groups) {
      const name = group.name.trim() || `Grupo ${payload.length + 1}`
      const parsed = parseGradeInput(group.grade, sheet.conventions)
      if (parsed.kind === 'invalid') {
        toast.error(`La nota de "${name}" no es una nota ni una de tus convenciones.`)
        return
      }
      if (parsed.kind === 'score' && (parsed.value < 1 || parsed.value > maxScore)) {
        toast.error(`La nota de "${name}" debe estar entre 1.0 y ${maxScore.toFixed(1)}.`)
        return
      }
      payload.push({
        id: group.id,
        name,
        student_ids: group.studentIds,
        score: parsed.kind === 'score' ? parsed.value : null,
        convention_id: parsed.kind === 'convention' ? parsed.convention.id : null,
      })
    }

    setSaving(true)
    try {
      const { grades_updated } = await workGroupsApi.sync(column.id, payload)
      toast.success(
        grades_updated > 0
          ? `Grupos guardados. Se actualizó la nota de ${grades_updated} estudiantes.`
          : 'Grupos guardados.'
      )
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
      onOpenChange(false)
    } catch {
      toast.error('No pudimos guardar los grupos.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Grupos de trabajo — {column.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2">
          <Button size="sm" variant="outline" onClick={addGroup}>
            <Plus /> Agregar grupo
          </Button>
          <div className="flex items-end gap-1">
            <div className="space-y-1">
              <Label className="text-xs">Por grupo</Label>
              <Input
                className="h-9 w-16"
                inputMode="numeric"
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
              />
            </div>
            <Button size="sm" variant="outline" onClick={shuffleUngrouped} disabled={ungrouped.length === 0}>
              <Shuffle /> Repartir al azar
            </Button>
          </div>
          {copySources.length > 0 && (
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value=""
              onChange={(e) => e.target.value && copyFrom(Number(e.target.value))}
            >
              <option value="">Copiar grupos de…</option>
              {copySources.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="flex flex-col gap-2">
            {groups.length === 0 && (
              <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                Esta actividad aún no tiene grupos. Agrega uno o repártelos al azar.
              </p>
            )}
            {groups.map((group) => (
              <div
                key={group.key}
                onClick={() => setActiveKey(group.key)}
                className={`rounded-md border p-2 ${activeKey === group.key ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 flex-1"
                    aria-label="Nombre del grupo"
                    value={group.name}
                    onChange={(e) => update(group.key, { name: e.target.value })}
                  />
                  <Input
                    className="h-8 w-20 text-center"
                    aria-label="Nota del grupo"
                    placeholder="Nota"
                    title={(() => {
                      const parsed = parseGradeInput(group.grade, sheet.conventions)
                      return parsed.kind === 'convention' ? conventionTitle(parsed.convention) : `1.0 – ${maxScore.toFixed(1)}`
                    })()}
                    value={group.grade}
                    onChange={(e) => update(group.key, { grade: e.target.value })}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Eliminar ${group.name}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      removeGroup(group.key)
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {group.studentIds.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      {activeKey === group.key ? 'Toca un estudiante de la lista para agregarlo.' : 'Sin integrantes.'}
                    </span>
                  )}
                  {group.studentIds.map((id) => (
                    <span key={id} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
                      {studentLabel(studentsById.get(id))}
                      <button
                        type="button"
                        aria-label="Quitar del grupo"
                        className="rounded hover:bg-background"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeMember(group.key, id)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border p-2">
            <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Sin grupo ({ungrouped.length})</p>
            <div className="flex max-h-72 flex-col overflow-y-auto">
              {ungrouped.length === 0 && <span className="text-xs text-muted-foreground">Todos tienen grupo.</span>}
              {ungrouped.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => addToActive(student.id)}
                  className="rounded px-2 py-1 text-left text-sm hover:bg-muted"
                >
                  {studentLabel(student)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Al guardar, la nota de cada grupo se copia a sus integrantes en esta actividad. Si cambias la nota de un grupo,
          se reescribe a todos; si no, se respeta la que le hayas cambiado a mano a alguno en la planilla.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar grupos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function studentLabel(student: GradeSheetStudent | undefined) {
  return student ? `${student.last_name} ${student.first_name}` : 'Estudiante retirado'
}
