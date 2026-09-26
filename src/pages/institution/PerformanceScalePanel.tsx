import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Plus, Trash2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/services/api/client'
import { levelColors } from '@/utils/gradeHelpers'
import { NATIONAL_LEVELS, NATIONAL_LEVEL_LABELS } from '@/types'
import type { Institution, NationalLevel, PerformanceLevel } from '@/types'

type GradingScale = Institution['grading_scale']

/** Un nivel en edición: el "desde" no se guarda, se deriva del "hasta" del nivel anterior. */
interface DraftLevel {
  name: string
  national_level: NationalLevel
  max: string
  color: string
}

const LEVEL_COLORS = ['#C62828', '#EF6C00', '#F9A825', '#9E9D24', '#2E7D32', '#00695C', '#1565C0', '#6A1B9A', '#AD1457', '#546E7A']

const scaleMax = (scale: GradingScale) => (scale === '1_to_5' ? 5 : 10)

const fmt = (n: number) => n.toFixed(1)

function toDraft(levels: PerformanceLevel[]): DraftLevel[] {
  return levels.map((l) => ({ name: l.name, national_level: l.national_level, max: fmt(Number(l.max_score)), color: l.color }))
}

/** Rangos a partir de los "hasta": cada nivel empieza 0.1 después del anterior; el último termina en el máximo. */
function withRanges(levels: DraftLevel[], max: number) {
  let from = 1
  return levels.map((level, index) => {
    const isLast = index === levels.length - 1
    const to = isLast ? max : Number(level.max.replace(',', '.'))
    const row = { ...level, min: from, maxValue: to }
    from = Math.round((to + 0.1) * 10) / 10
    return row
  })
}

function validate(rows: ReturnType<typeof withRanges>, max: number): string[] {
  const problems: string[] = []
  rows.forEach((row, index) => {
    if (!row.name.trim()) problems.push(`El nivel ${index + 1} no tiene nombre.`)
    if (Number.isNaN(row.maxValue) || row.maxValue < row.min || row.maxValue > max)
      problems.push(`"${row.name || `Nivel ${index + 1}`}" debe terminar entre ${fmt(row.min)} y ${fmt(max)}.`)
    const previous = rows[index - 1]
    if (previous && NATIONAL_LEVELS.indexOf(row.national_level) < NATIONAL_LEVELS.indexOf(previous.national_level))
      problems.push(`"${row.name}" tiene notas más altas que "${previous.name}" pero una equivalencia nacional menor.`)
  })
  const missing = NATIONAL_LEVELS.filter((n) => !rows.some((r) => r.national_level === n))
  if (missing.length) problems.push(`Falta la equivalencia con: ${missing.map((m) => NATIONAL_LEVEL_LABELS[m]).join(', ')}.`)
  return problems
}

/**
 * Escala de valoración institucional (la del SIEE). Por norma (Decreto 1290 de
 * 2009, art. 5; Decreto 1075 de 2015, art. 2.3.3.3.3.5) cada nivel expresa su
 * equivalencia con la escala nacional. La nota mínima para aprobar se deriva de
 * aquí: el inicio del primer nivel que no es Bajo.
 */
export function PerformanceScalePanel({ institution }: { institution: Institution }) {
  const queryClient = useQueryClient()
  const [gradingScale, setGradingScale] = useState<GradingScale>(institution.grading_scale)
  const [levels, setLevels] = useState<DraftLevel[]>(() => toDraft(institution.performance_levels ?? []))

  // Si la escala guardada cambia (se guardó aquí u otro admin la cambió), se
  // recarga el borrador. Depende del contenido, no del objeto: un simple refetch
  // (al volver a la ventana) trae un arreglo nuevo con lo mismo y no debe borrar
  // lo que se está editando.
  const savedKey = JSON.stringify([institution.grading_scale, institution.performance_levels ?? []])
  useEffect(() => {
    const [scale, saved] = JSON.parse(savedKey) as [GradingScale, PerformanceLevel[]]
    setGradingScale(scale)
    setLevels(toDraft(saved))
  }, [savedKey])

  const max = scaleMax(gradingScale)
  const rows = useMemo(() => withRanges(levels, max), [levels, max])
  const problems = validate(rows, max)
  const passing = rows.find((r) => r.national_level !== 'bajo')?.min
  const scaleChanged = gradingScale !== institution.grading_scale

  const loadSuggested = async (scale: GradingScale) => {
    try {
      const { data } = await api.get<{ data: PerformanceLevel[] }>(
        `/institutions/${institution.id}/performance-levels/suggested`,
        { params: { grading_scale: scale } }
      )
      setGradingScale(scale)
      setLevels(toDraft(data.data))
    } catch {
      toast.error('No pudimos cargar la escala sugerida.')
    }
  }

  const save = useMutation({
    mutationFn: () =>
      api.put(`/institutions/${institution.id}/performance-levels`, {
        grading_scale: gradingScale,
        levels: rows.map((r) => ({
          name: r.name.trim(),
          national_level: r.national_level,
          min_score: r.min,
          max_score: r.maxValue,
          color: r.color,
        })),
      }),
    onSuccess: () => {
      toast.success('Escala guardada. La planilla y los reportes ya usan estos colores.')
      queryClient.invalidateQueries({ queryKey: ['institutions', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['grades-sheet'] })
      queryClient.invalidateQueries({ queryKey: ['student-profile'] })
    },
    onError: (error) =>
      toast.error(
        (axios.isAxiosError(error) && (error.response?.data?.errors?.levels?.[0] || error.response?.data?.message)) ||
          'No pudimos guardar la escala.'
      ),
  })

  const update = (index: number, changes: Partial<DraftLevel>) =>
    setLevels((prev) => prev.map((l, i) => (i === index ? { ...l, ...changes } : l)))

  const addLevel = () =>
    setLevels((prev) => {
      // Parte en dos el nivel más amplio (sin tocar el último, que siempre llega al máximo).
      const ranges = withRanges(prev, max)
      const widest = ranges.slice(0, -1).reduce((best, r, i) => (r.maxValue - r.min > ranges[best].maxValue - ranges[best].min ? i : best), 0)
      const splitAt = Math.round(((ranges[widest].min + ranges[widest].maxValue) / 2) * 10) / 10
      const copy = [...prev]
      copy.splice(widest, 0, { ...prev[widest], name: `${prev[widest].name} (nuevo)`, max: fmt(splitAt) })
      return copy
    })

  const sampleScores = rows.map((r) => Math.round(((r.min + r.maxValue) / 2) * 10) / 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escala de valoración</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Cada colegio define su escala en el SIEE (la aprueba el consejo directivo), pero cada nivel debe decir a qué
          equivale en la escala nacional: Desempeño Superior, Alto, Básico o Bajo (Decreto 1290 de 2009, art. 5; Decreto
          1075 de 2015, art. 2.3.3.3.3.5). Básico es superar los desempeños necesarios; Bajo, no superarlos. Preescolar se
          evalúa con informes descriptivos, no con esta escala (Decreto 2247 de 1997, art. 14).
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">Notas de</span>
          {(['1_to_5', '1_to_10'] as GradingScale[]).map((scale) => (
            <Button
              key={scale}
              size="sm"
              variant={gradingScale === scale ? 'default' : 'outline'}
              onClick={() => scale !== gradingScale && loadSuggested(scale)}
            >
              1.0 a {scaleMax(scale)}.0
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={() => loadSuggested(gradingScale)}>
            Usar la escala sugerida
          </Button>
        </div>

        {scaleChanged && (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            Cambiar de 1.0–{scaleMax(institution.grading_scale)}.0 a 1.0–{max}.0 no convierte las notas ya registradas ni
            la nota máxima de las columnas que ya existen. Hazlo antes de empezar a calificar el año.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <div className="hidden grid-cols-[1fr_180px_70px_80px_auto] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
            <span>Nombre en el colegio</span>
            <span>Equivale a (escala nacional)</span>
            <span>Desde</span>
            <span>Hasta</span>
            <span />
          </div>
          {rows.map((row, index) => {
            const isLast = index === rows.length - 1
            return (
              <div key={index} className="flex flex-col gap-2 rounded-md border p-2">
                <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[1fr_180px_70px_80px_auto]">
                  <Input
                    className="col-span-2 h-9 sm:col-span-1"
                    value={row.name}
                    maxLength={50}
                    onChange={(e) => update(index, { name: e.target.value })}
                    aria-label="Nombre del nivel"
                  />
                  <select
                    className="col-span-2 h-9 rounded-md border border-input bg-transparent px-2 text-sm sm:col-span-1"
                    value={row.national_level}
                    onChange={(e) => update(index, { national_level: e.target.value as NationalLevel })}
                    aria-label="Equivalencia nacional"
                  >
                    {NATIONAL_LEVELS.map((n) => (
                      <option key={n} value={n}>
                        {NATIONAL_LEVEL_LABELS[n]}
                      </option>
                    ))}
                  </select>
                  <span className="text-center text-sm text-muted-foreground">{fmt(row.min)}</span>
                  <Input
                    className="h-9 text-center"
                    inputMode="decimal"
                    value={isLast ? fmt(max) : row.max}
                    disabled={isLast}
                    onChange={(e) => update(index, { max: e.target.value })}
                    aria-label="Hasta"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={rows.length <= 4}
                    onClick={() => setLevels((prev) => prev.filter((_, i) => i !== index))}
                    aria-label="Quitar nivel"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="mr-1 text-xs text-muted-foreground">Color en la planilla:</span>
                  {LEVEL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => update(index, { color })}
                      className={`h-6 w-6 rounded-full border-2 ${color.toLowerCase() === row.color.toLowerCase() ? 'border-foreground' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Color ${color}`}
                    />
                  ))}
                  <label className="relative flex h-6 cursor-pointer items-center rounded-full border px-2 text-xs" title="Otro color">
                    Otro
                    <input
                      type="color"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      value={row.color}
                      onChange={(e) => update(index, { color: e.target.value.toUpperCase() })}
                    />
                  </label>
                  <span
                    className="ml-2 rounded px-2 py-0.5 text-sm font-medium"
                    style={{ backgroundColor: levelColors(row.color).background, color: levelColors(row.color).text }}
                  >
                    {fmt(sampleScores[index])}
                  </span>
                </div>
              </div>
            )
          })}
          <Button size="sm" variant="outline" className="w-fit" onClick={addLevel} disabled={rows.length >= 8}>
            <Plus className="h-4 w-4" /> Agregar nivel
          </Button>
        </div>

        {/* Vista previa: la escala completa como barra, proporcional a cada rango. */}
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Vista previa</p>
          <div className="flex h-9 overflow-hidden rounded-md border text-xs font-medium">
            {rows.map((row, index) => {
              const width = Math.max(((row.maxValue - row.min + 0.1) / (max - 0.9)) * 100, 4)
              const { background, text } = levelColors(row.color)
              return (
                <div
                  key={index}
                  className="flex items-center justify-center truncate px-1"
                  style={{ width: `${width}%`, backgroundColor: background, color: text }}
                  title={`${row.name}: ${fmt(row.min)}–${fmt(row.maxValue)} (${NATIONAL_LEVEL_LABELS[row.national_level]})`}
                >
                  {row.name} {fmt(row.min)}–{fmt(row.maxValue)}
                </div>
              )
            })}
          </div>
        </div>

        {problems.length > 0 ? (
          <ul className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nota mínima para aprobar: <strong>{passing !== undefined ? fmt(passing) : '—'}</strong> (inicio del primer
            nivel que no es Bajo). Se usa en los colores, el riesgo académico y los reportes.
          </p>
        )}

        <Button className="w-fit" onClick={() => save.mutate()} disabled={problems.length > 0 || save.isPending}>
          {save.isPending ? 'Guardando...' : 'Guardar escala'}
        </Button>
      </CardContent>
    </Card>
  )
}
