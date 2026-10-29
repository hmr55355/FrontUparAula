import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { gradeColumnsApi } from '@/services/api/grades'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { SameGradeQuestion } from '@/components/SameGradeQuestion'
import type { GradeSection, WorkGroupSet } from '@/types/grades'

/** Abreviatura sugerida para el encabezado: iniciales o el inicio del nombre (máx. 8). */
function suggestShortName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const withNumber = name.match(/(\d+)\s*$/)?.[1] ?? ''
  const base = words.length > 1 ? words.filter((w) => !/^\d+$/.test(w)).map((w) => w[0].toUpperCase()).join('') : words[0].slice(0, 4)
  return (base + withNumber).slice(0, 8)
}

/**
 * Agregar una actividad (columna manual) directo desde la planilla. El peso se
 * reparte por igual en la sección (automático) o se escribe (manual); en los dos
 * casos el backend recalcula las definitivas.
 */
export function AddActivityDialog({
  open,
  onOpenChange,
  sections,
  presetSectionId,
  groupSubjectId,
  periodId,
  groupName,
  workGroupSets = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sections: GradeSection[]
  presetSectionId?: number
  groupSubjectId: number
  periodId: number
  /** Nombre del grupo actual, para la pregunta de los otros cursos del grado. */
  groupName?: string
  /** Conjuntos de grupos de trabajo del curso, para que la actividad nazca con ellos. */
  workGroupSets?: WorkGroupSet[]
}) {
  const queryClient = useQueryClient()
  const { data: institution } = useCurrentInstitution()
  const scaleMax = institution?.grading_scale === '1_to_5' ? 5 : 10

  const [sectionId, setSectionId] = useState<number | ''>(presetSectionId ?? sections[0]?.id ?? '')
  const [name, setName] = useState('')
  const [shortName, setShortName] = useState('')
  const [shortTouched, setShortTouched] = useState(false)
  const [maxScore, setMaxScore] = useState(String(scaleMax))
  const [date, setDate] = useState('')
  const [weightMode, setWeightMode] = useState<'automatic' | 'manual'>('automatic')
  const [weight, setWeight] = useState('')
  const [saving, setSaving] = useState(false)
  // Paso 2: preguntar si también va en los otros cursos del grado.
  const [asking, setAsking] = useState(false)
  const [alsoIn, setAlsoIn] = useState<number[]>([])

  const { data: siblings } = useQuery({
    queryKey: ['grade-column-siblings', sectionId],
    queryFn: () => gradeColumnsApi.siblings(sectionId as number),
    enabled: open && !!sectionId,
    staleTime: 60 * 1000,
  })

  const section = sections.find((s) => s.id === sectionId)

  // Sin grupos por defecto: el docente elige si la actividad usa unos grupos ya creados.
  const [workGroupSetId, setWorkGroupSetId] = useState<number | null>(null)
  const count = (section?.columns.length ?? 0) + 1
  const share = (Math.floor(1000 / count) / 10).toFixed(1)

  /** `onlyHere`: respuesta "solo en este curso" a la pregunta de los otros cursos. */
  const save = async (onlyHere = false) => {
    if (!sectionId || !name.trim()) {
      toast.error('Elige la sección y escribe el nombre de la actividad.')
      return
    }
    if (weightMode === 'manual' && weight === '') {
      toast.error('Escribe el peso de la actividad.')
      return
    }
    // Primero la pregunta, si tiene otros cursos de la misma materia en el grado.
    if (!asking && siblings?.length) {
      setAlsoIn(siblings.filter((s) => s.section_id).map((s) => s.group_subject_id))
      setAsking(true)
      return
    }
    const targets = [sectionId, ...(siblings ?? []).filter((s) => s.section_id && !onlyHere && alsoIn.includes(s.group_subject_id)).map((s) => s.section_id as number)]
    const payload = {
      column_type: 'manual' as const,
      name: name.trim(),
      short_name: shortName.trim() || undefined,
      max_score: Number(maxScore) || scaleMax,
      date: date || undefined,
      weight_mode: weightMode,
      weight: weightMode === 'manual' ? Number(weight) : undefined,
    }
    setSaving(true)
    try {
      // Los grupos son de este curso: en los otros cursos del grado la actividad nace sin grupos.
      await gradeColumnsApi.create({ ...payload, grade_section_id: sectionId, work_group_set_id: workGroupSetId })
      // Los otros cursos uno por uno: si alguno falla, los demás quedan y se avisa cuál.
      const failed: string[] = []
      for (const target of targets.slice(1)) {
        try {
          await gradeColumnsApi.create({ ...payload, grade_section_id: target })
        } catch {
          failed.push(siblings?.find((s) => s.section_id === target)?.group_name ?? '?')
        }
      }
      const extra = targets.length - 1 - failed.length
      toast.success(`Actividad "${name.trim()}" agregada${extra > 0 ? ` aquí y en ${extra} ${extra === 1 ? 'curso más' : 'cursos más'}` : ''}.`)
      if (failed.length) toast.error(`No se pudo agregar en ${failed.join(', ')}.`)
      queryClient.invalidateQueries({ queryKey: extra > 0 ? ['grades-sheet'] : gradeSheetQueryKey(groupSubjectId, periodId) })
      onOpenChange(false)
    } catch (error) {
      toast.error((axios.isAxiosError(error) && error.response?.data?.message) || 'No pudimos agregar la actividad.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva actividad</DialogTitle>
        </DialogHeader>
        {asking && siblings ? (
          <SameGradeQuestion
            what="esta actividad"
            currentName={groupName ?? 'este curso'}
            options={siblings.map((s) => ({
              id: s.group_subject_id,
              label: s.group_name,
              unavailable: s.section_id ? undefined : `no tiene la sección "${section?.name}" en este período`,
            }))}
            selected={alsoIn}
            onChange={setAlsoIn}
          />
        ) : (
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Sección</Label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-3"
              value={sectionId}
              onChange={(e) => setSectionId(Number(e.target.value))}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({Number(s.weight)}%)
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-[1fr_110px] gap-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input
                autoFocus
                placeholder="Quiz 2"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (!shortTouched) setShortName(suggestShortName(e.target.value))
                }}
              />
            </div>
            <div className="space-y-1">
              <Label>Encabezado</Label>
              <Input
                maxLength={8}
                placeholder="Q2"
                value={shortName}
                onChange={(e) => {
                  setShortTouched(true)
                  setShortName(e.target.value)
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nota máxima</Label>
              <Input type="number" step="0.1" min={1} max={10} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fecha (opcional)</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          {workGroupSets.length > 0 && (
            <div className="space-y-1">
              <Label>Grupos de trabajo</Label>
              <select
                aria-label="Grupos de trabajo"
                className="h-12 w-full rounded-md border border-input bg-transparent px-3"
                value={workGroupSetId ?? ''}
                onChange={(e) => setWorkGroupSetId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Sin grupos (individual)</option>
                {workGroupSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name} ({set.groups_count} {set.groups_count === 1 ? 'equipo' : 'equipos'})
                  </option>
                ))}
              </select>
              {workGroupSetId && (
                <p className="text-xs text-muted-foreground">
                  La actividad usará los equipos de este grupo; la nota de cada equipo se pone aparte, en el icono de grupos de la columna.
                </p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <Label>Peso en la sección</Label>
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={weightMode === 'automatic' ? 'default' : 'outline'}
                onClick={() => setWeightMode('automatic')}
              >
                Automático
              </Button>
              <Button
                type="button"
                size="sm"
                variant={weightMode === 'manual' ? 'default' : 'outline'}
                onClick={() => setWeightMode('manual')}
              >
                Manual
              </Button>
            </div>
            {weightMode === 'automatic' ? (
              <p className="text-xs text-muted-foreground">
                {section
                  ? `Las ${count} actividades de "${section.name}" quedarán con ${share} % cada una.`
                  : 'Todas las actividades de la sección quedarán con el mismo peso.'}
              </p>
            ) : (
              <>
                <Input type="number" step="0.1" placeholder="%" value={weight} onChange={(e) => setWeight(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Los pesos de las demás actividades no cambian; ajústalos en "Configurar planilla" si deben sumar 100 %.
                </p>
              </>
            )}
          </div>
        </div>
        )}
        <DialogFooter className="gap-2">
          {asking ? (
            <>
              <Button variant="ghost" onClick={() => setAsking(false)} disabled={saving}>
                Volver
              </Button>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => save(true)}
              >
                Solo en {groupName ?? 'este curso'}
              </Button>
              <Button onClick={() => save()} disabled={saving || alsoIn.length === 0}>
                {saving ? 'Guardando...' : `Agregar en ${alsoIn.length + 1} cursos`}
              </Button>
            </>
          ) : (
            <Button onClick={() => save()} disabled={saving}>
              {saving ? 'Guardando...' : siblings?.length ? 'Continuar' : 'Agregar actividad'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
