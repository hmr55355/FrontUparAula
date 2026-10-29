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
import { columnNames, workGroupSetsOf, workGroupsOf } from '@/pages/grades/workGroupHelpers'
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
 * Los grupos de un conjunto vistos desde esta actividad: integrantes y nombres del
 * conjunto, y la nota de cada grupo en esta actividad (vacía si aún no la usa).
 */
function draftsFor(sheet: GradeSheetResponse, setId: number, columnId: number): DraftGroup[] {
  const own = workGroupsOf(sheet, columnId).filter((g) => g.set_id === setId)
  const set = workGroupSetsOf(sheet).find((s) => s.id === setId)
  const source = own.length > 0 ? own : workGroupsOf(sheet, set?.column_ids[0] ?? -1)
  return source.map((g) => ({
    key: `id-${g.id}`,
    id: g.id,
    name: g.name,
    studentIds: g.student_ids,
    grade: own.length > 0 ? gradeText(g, sheet) : '',
  }))
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
  const sets = workGroupSetsOf(sheet)
  const names = useMemo(() => columnNames(sheet), [sheet])
  // Conjunto que usa la actividad; null = uno nuevo.
  const currentSetId = column.work_group_set_id ?? workGroupsOf(sheet, column.id)[0]?.set_id ?? null
  const [setId, setSetId] = useState<number | null>(currentSetId)
  const [setName, setSetName] = useState(
    () => sets.find((s) => s.id === currentSetId)?.name ?? `Grupos de ${column.name}`
  )
  const [groups, setGroups] = useState<DraftGroup[]>(() => (currentSetId ? draftsFor(sheet, currentSetId, column.id) : []))
  // Otras actividades que comparten el conjunto elegido: cambiar integrantes o nombres las afecta.
  const sharedWith = (sets.find((s) => s.id === setId)?.column_ids ?? []).filter((id) => id !== column.id)
  const [activeKey, setActiveKey] = useState<string | null>(groups[0]?.key ?? null)
  const [groupSize, setGroupSize] = useState('4')
  const [saving, setSaving] = useState(false)
  const maxScore = Number(column.max_score)

  const studentsById = useMemo(() => new Map(sheet.students.map((s) => [s.id, s])), [sheet.students])
  const grouped = new Set(groups.flatMap((g) => g.studentIds))
  const ungrouped = sheet.students.filter((s) => !grouped.has(s.id))

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

  /** Cambiar de conjunto: sus grupos con la nota de esta actividad (o uno nuevo, vacío). */
  const chooseSet = (value: string) => {
    if (value === 'new') {
      setSetId(null)
      setSetName(`Grupos de ${column.name}`)
      setGroups([])
      setActiveKey(null)
      return
    }
    const id = Number(value)
    const drafts = draftsFor(sheet, id, column.id)
    setSetId(id)
    setSetName(sets.find((s) => s.id === id)?.name ?? '')
    setGroups(drafts)
    setActiveKey(drafts[0]?.key ?? null)
  }

  /** La actividad deja de usar grupos (el conjunto sigue para las demás actividades). */
  const unlink = async () => {
    if (!window.confirm(`¿Quitar los grupos de "${column.name}"? Las notas que ya tienen los estudiantes no se borran.`)) return
    setSaving(true)
    try {
      await workGroupsApi.sync(column.id, { setId: currentSetId, groups: [] })
      toast.success('La actividad ya no usa grupos.')
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
      onOpenChange(false)
    } catch {
      toast.error('No pudimos quitar los grupos.')
    } finally {
      setSaving(false)
    }
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
      if (payload.length === 0) {
        toast.error('Agrega al menos un grupo, o usa "Quitar grupos".')
        return
      }
      const { grades_updated } = await workGroupsApi.sync(column.id, { setId, setName: setName.trim() || undefined, groups: payload })
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

        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-2">
          <div className="flex flex-wrap items-end gap-2">
            {sets.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Grupos que usa esta actividad</Label>
                <select
                  aria-label="Conjunto de grupos"
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={setId ?? 'new'}
                  onChange={(e) => chooseSet(e.target.value)}
                >
                  {sets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.groups_count} {s.groups_count === 1 ? 'grupo' : 'grupos'})
                    </option>
                  ))}
                  <option value="new">+ Grupos nuevos</option>
                </select>
              </div>
            )}
            <div className="min-w-[12rem] flex-1 space-y-1">
              <Label className="text-xs">Nombre de estos grupos</Label>
              <Input
                className="h-9"
                aria-label="Nombre del conjunto"
                placeholder="Proyecto feria"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {sharedWith.length > 0
              ? `También los usan: ${sharedWith.map((id) => names.get(id)).join(', ')}. Cambiar nombres o integrantes se aplica en todas; la nota de cada grupo es solo de "${column.name}".`
              : 'Al crear la siguiente actividad (otra fase, por ejemplo) puedes elegir estos mismos grupos y ponerles otra nota.'}
          </p>
        </div>

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

        <DialogFooter className="gap-2 sm:justify-between">
          {currentSetId ? (
            <Button variant="ghost" className="text-destructive" onClick={unlink} disabled={saving}>
              Quitar grupos de esta actividad
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar grupos'}
          </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function studentLabel(student: GradeSheetStudent | undefined) {
  return student ? `${student.last_name} ${student.first_name}` : 'Estudiante retirado'
}
