import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { gradeSectionsApi } from '@/services/api/gradeSections'
import { gradeTemplatesApi } from '@/services/api/gradeTemplates'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'
import type { GradeColumnDraft, GradeSectionDraft } from '@/types/grades'
import type { GradeSheetResponse } from '@/types/grades'

const COLUMN_TYPE_LABELS: Record<GradeColumnDraft['column_type'], string> = {
  manual: 'Manual',
  from_attendance: 'Calculada desde asistencia',
  section_average: 'Promedio de sección',
  custom_formula: 'Fórmula personalizada',
  from_participation: 'Calculada desde participaciones',
}

type WeightMode = 'manual' | 'automatic'

// Reparte 100 entre n valores a 1 decimal; el último absorbe el residuo del
// redondeo para que la suma dé exactamente 100.0 en vez de confiar en que
// Math.round(suma) sea indulgente.
function distributeEqually(n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor((100 / n) * 10) / 10
  const weights = Array(n).fill(base)
  weights[n - 1] = Math.round((100 - base * (n - 1)) * 10) / 10
  return weights
}

export function ConfigureSheetDialog({
  open,
  onOpenChange,
  sheet,
  groupSubjectId,
  periodId,
  institutionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sheet: GradeSheetResponse
  groupSubjectId: number
  periodId: number
  institutionId: number
}) {
  const queryClient = useQueryClient()
  const [sections, setSections] = useState<GradeSectionDraft[]>(() => toDraft(sheet))
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [weightModes, setWeightModes] = useState<Record<number, WeightMode>>({})
  const weightMode: WeightMode = weightModes[selectedIndex] ?? 'manual'

  const { data: templates } = useQuery({
    queryKey: ['grade-templates', institutionId],
    queryFn: () => gradeTemplatesApi.list(institutionId),
    enabled: open,
  })

  const sectionsWeight = sections.reduce((sum, s) => sum + Number(s.weight || 0), 0)
  const selected = sections[selectedIndex] as GradeSectionDraft | undefined
  const columnsWeight = selected ? selected.columns.reduce((sum, c) => sum + Number(c.weight || 0), 0) : 0
  const canSave =
    Math.round(sectionsWeight) === 100 &&
    sections.every((s) => s.final_calculation !== 'weighted_avg' || Math.round(s.columns.reduce((sum, c) => sum + Number(c.weight || 0), 0)) === 100)

  const updateSection = (index: number, patch: Partial<GradeSectionDraft>) => {
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { name: 'Nueva sección', weight: 0, color: '#1565C0', has_section_final: true, final_calculation: 'weighted_avg', columns: [] },
    ])
    setSelectedIndex(sections.length)
  }

  const removeSection = (index: number) => {
    setSections((prev) => prev.filter((_, i) => i !== index))
    setSelectedIndex(0)
  }

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= sections.length) return
    setSections((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setSelectedIndex((current) => (current === index ? target : current === target ? index : current))
  }

  const setWeightMode = (mode: WeightMode) => {
    setWeightModes((prev) => ({ ...prev, [selectedIndex]: mode }))
    if (mode === 'automatic' && selected && selected.columns.length > 0) {
      const weights = distributeEqually(selected.columns.length)
      updateSection(selectedIndex, { columns: selected.columns.map((c, i) => ({ ...c, weight: weights[i] })) })
    }
  }

  const addColumn = () => {
    if (!selected) return
    const newColumn: GradeColumnDraft = { name: 'Nueva columna', short_name: '', column_type: 'manual', weight: 0 }

    if (weightMode === 'automatic') {
      const weights = distributeEqually(selected.columns.length + 1)
      const columns = [...selected.columns, newColumn].map((c, i) => ({ ...c, weight: weights[i] }))
      updateSection(selectedIndex, { columns })
      return
    }

    updateSection(selectedIndex, { columns: [...selected.columns, newColumn] })
  }

  const updateColumn = (columnIndex: number, patch: Partial<GradeColumnDraft>) => {
    if (!selected) return
    const columns = selected.columns.map((c, i) => (i === columnIndex ? { ...c, ...patch } : c))
    updateSection(selectedIndex, { columns })
  }

  const moveColumn = (columnIndex: number, direction: -1 | 1) => {
    if (!selected) return
    const target = columnIndex + direction
    if (target < 0 || target >= selected.columns.length) return
    const columns = [...selected.columns]
    ;[columns[columnIndex], columns[target]] = [columns[target], columns[columnIndex]]
    updateSection(selectedIndex, { columns })
  }

  const removeColumn = (columnIndex: number) => {
    if (!selected) return
    const remaining = selected.columns.filter((_, i) => i !== columnIndex)

    if (weightMode === 'automatic') {
      const weights = distributeEqually(remaining.length)
      updateSection(selectedIndex, { columns: remaining.map((c, i) => ({ ...c, weight: weights[i] })) })
      return
    }

    updateSection(selectedIndex, { columns: remaining })
  }

  const save = async (confirmDelete = false) => {
    setSaving(true)
    try {
      await gradeSectionsApi.bulkSave({
        group_subject_id: groupSubjectId,
        period_id: periodId,
        sections,
        confirm_delete: confirmDelete,
      })
      toast.success('Planilla actualizada.')
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
      onOpenChange(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        if (window.confirm(error.response.data.message + ' ¿Continuar de todas formas?')) {
          await save(true);
          return
        }
      } else {
        toast.error('No pudimos guardar la configuración.')
      }
    } finally {
      setSaving(false)
    }
  }

  const saveAsTemplate = async () => {
    const name = window.prompt('Nombre de la plantilla:')
    if (!name) return
    try {
      await gradeTemplatesApi.save({ group_subject_id: groupSubjectId, period_id: periodId, name, is_shared: true })
      toast.success('Plantilla guardada.')
      queryClient.invalidateQueries({ queryKey: ['grade-templates', institutionId] })
    } catch {
      toast.error('No pudimos guardar la plantilla. Guarda primero la configuración actual.')
    }
  }

  const loadTemplate = async (templateId: number) => {
    try {
      const applied = await gradeTemplatesApi.apply(templateId, groupSubjectId, periodId)
      setSections(applied.map(sectionToDraft))
      toast.success('Plantilla aplicada.')
    } catch {
      toast.error('No pudimos aplicar la plantilla. Es posible que la planilla ya tenga secciones.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configurar planilla</DialogTitle>
        </DialogHeader>

        {Math.round(sectionsWeight) !== 100 && (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            Los pesos de las secciones suman {sectionsWeight}% — {sectionsWeight < 100 ? 'faltan' : 'sobran'}{' '}
            {Math.abs(100 - sectionsWeight)}%.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Secciones</p>
            {sections.map((section, index) => (
              <div
                key={index}
                className={`flex items-center gap-1 rounded-md border px-1 py-1 text-sm ${
                  index === selectedIndex ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className="flex flex-1 items-center gap-2 truncate px-1 py-0.5 text-left"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: section.color }} />
                  <span className="truncate">
                    {section.name} ({section.weight}%)
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === 0}
                  onClick={() => moveSection(index, -1)}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === sections.length - 1}
                  onClick={() => moveSection(index, 1)}
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addSection}>
              <Plus className="h-4 w-4" /> Sección
            </Button>
          </div>

          <div className="flex flex-col gap-3">
            {selected ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Nombre</Label>
                    <Input value={selected.name} onChange={(e) => updateSection(selectedIndex, { name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Peso en Def Total (%)</Label>
                    <Input
                      type="number"
                      value={selected.weight}
                      onChange={(e) => updateSection(selectedIndex, { weight: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Color</Label>
                    <Input
                      type="color"
                      value={selected.color}
                      onChange={(e) => updateSection(selectedIndex, { color: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cálculo de definitiva</Label>
                    <select
                      className="h-12 w-full rounded-md border border-input bg-transparent px-3"
                      value={selected.final_calculation}
                      onChange={(e) => updateSection(selectedIndex, { final_calculation: e.target.value as GradeSectionDraft['final_calculation'] })}
                    >
                      <option value="weighted_avg">Promedio ponderado</option>
                      <option value="simple_avg">Promedio simple</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                </div>

                <Button variant="ghost" size="sm" className="w-fit text-destructive" onClick={() => removeSection(selectedIndex)}>
                  <Trash2 className="h-4 w-4" /> Eliminar sección
                </Button>

                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Columnas {selected.final_calculation === 'weighted_avg' && `(suman ${columnsWeight}%)`}
                  </p>
                  <Button variant="outline" size="sm" onClick={addColumn}>
                    <Plus className="h-4 w-4" /> Columna
                  </Button>
                </div>

                {selected.final_calculation === 'weighted_avg' && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Asignación de pesos:</Label>
                    <div className="flex flex-wrap gap-1">
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
                  </div>
                )}

                {selected.final_calculation === 'weighted_avg' && Math.round(columnsWeight) !== 100 && (
                  <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                    Los pesos de las columnas suman {columnsWeight}% — deben sumar 100%.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {selected.columns.map((column, columnIndex) => (
                    <div key={columnIndex} className="grid grid-cols-[1fr_70px_140px_70px_auto] items-end gap-2 rounded-md border p-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre</Label>
                        <Input value={column.name} onChange={(e) => updateColumn(columnIndex, { name: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Corto</Label>
                        <Input
                          maxLength={8}
                          value={column.short_name}
                          onChange={(e) => updateColumn(columnIndex, { short_name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tipo</Label>
                        <select
                          className="h-12 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                          value={column.column_type}
                          onChange={(e) => updateColumn(columnIndex, { column_type: e.target.value as GradeColumnDraft['column_type'] })}
                        >
                          {Object.entries(COLUMN_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Peso %</Label>
                        <Input
                          type="number"
                          value={column.weight}
                          disabled={weightMode === 'automatic'}
                          onChange={(e) => updateColumn(columnIndex, { weight: Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={columnIndex === 0}
                          onClick={() => moveColumn(columnIndex, -1)}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={columnIndex === selected.columns.length - 1}
                          onClick={() => moveColumn(columnIndex, 1)}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => removeColumn(columnIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      {column.column_type === 'from_attendance' && (
                        <div className="col-span-5 grid grid-cols-3 gap-2 border-t pt-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Nota base</Label>
                            <Input
                              type="number"
                              value={column.attendance_base_score ?? 10}
                              onChange={(e) => updateColumn(columnIndex, { attendance_base_score: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Penal. injustificada</Label>
                            <Input
                              type="number"
                              value={column.absence_penalty ?? 0.5}
                              onChange={(e) => updateColumn(columnIndex, { absence_penalty: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Penal. justificada</Label>
                            <Input
                              type="number"
                              value={column.justified_absence_penalty ?? 0.1}
                              onChange={(e) => updateColumn(columnIndex, { justified_absence_penalty: Number(e.target.value) })}
                            />
                          </div>
                        </div>
                      )}
                      {column.column_type === 'custom_formula' && (
                        <div className="col-span-5 border-t pt-2">
                          <Label className="text-xs">Fórmula (usa los nombres cortos, ej: (ev1 + ev2) / 2)</Label>
                          <Input
                            value={column.formula ?? ''}
                            onChange={(e) => updateColumn(columnIndex, { formula: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Agrega una sección para empezar.</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={saveAsTemplate}>
              Guardar como plantilla
            </Button>
            {templates && templates.length > 0 && (
              <select
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                defaultValue=""
                onChange={(e) => e.target.value && loadTemplate(Number(e.target.value))}
              >
                <option value="" disabled>
                  Cargar plantilla...
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button onClick={() => save(false)} disabled={!canSave || saving}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function toDraft(sheet: GradeSheetResponse): GradeSectionDraft[] {
  return sheet.sections.map(sectionToDraft)
}

function sectionToDraft(section: GradeSheetResponse['sections'][number]): GradeSectionDraft {
  return {
    id: section.id,
    name: section.name,
    short_name: section.short_name ?? '',
    weight: Number(section.weight),
    color: section.color,
    has_section_final: section.has_section_final,
    final_calculation: section.final_calculation,
    columns: section.columns.map((c) => ({
      id: c.id,
      name: c.name,
      short_name: c.short_name ?? '',
      column_type: c.column_type,
      weight: Number(c.weight),
      max_score: Number(c.max_score),
      attendance_base_score: Number(c.attendance_base_score),
      absence_penalty: Number(c.absence_penalty),
      justified_absence_penalty: Number(c.justified_absence_penalty),
      formula: c.formula,
    })),
  }
}
