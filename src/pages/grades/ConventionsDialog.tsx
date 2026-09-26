import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { gradeConventionsApi, type GradeConventionPayload } from '@/services/api/grades'
import type { GradeConvention } from '@/types/grades'

const gradeConventionsQueryKey = ['grade-conventions'] as const

/** Íconos que se ven bien en pantalla y también en los PDF (fuente DejaVu). */
const ICONS = ['✓', '✗', '☺', '☹', '★', '●', '○', '⚠']

function errorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    return data?.errors?.code?.[0] || data?.errors?.value?.[0] || data?.message || fallback
  }
  return fallback
}

/** "8,5" o "8.5" → 8.5; vacío → null (sin nota). undefined si no es un número válido. */
function parseValue(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const value = Number(trimmed.replace(',', '.'))
  return Number.isNaN(value) || value < 1 || value > 10 ? undefined : value
}

interface ConventionDraft {
  code: string
  label: string
  /** Texto tal como lo escribió el docente ("8,5", "" = sin nota). */
  value: string
}

function draftOf(convention: GradeConvention): ConventionDraft {
  return {
    code: convention.code,
    label: convention.label,
    value: convention.value === null ? '' : String(Number(convention.value)),
  }
}

function isDirty(convention: GradeConvention, draft: ConventionDraft) {
  const original = convention.value === null ? null : Number(convention.value)
  return (
    draft.code.trim() !== convention.code || draft.label.trim() !== convention.label || parseValue(draft.value) !== original
  )
}

function isValid(draft: ConventionDraft) {
  return draft.code.trim() !== '' && draft.label.trim() !== '' && parseValue(draft.value) !== undefined
}

/**
 * Convenciones del docente (NP, NA, ✓…). Son suyas y valen para todas sus
 * planillas. Las ediciones de las filas quedan como borrador y se guardan todas
 * juntas con "Guardar cambios" (útil tras agregar las sugeridas y ponerles nota).
 * Cambiar la nota de una convención actualiza las notas ya puestas.
 */
export function ConventionsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient()
  const [drafts, setDrafts] = useState<Record<number, ConventionDraft>>({})
  const [saving, setSaving] = useState(false)
  const { data: conventions } = useQuery({
    queryKey: gradeConventionsQueryKey,
    queryFn: gradeConventionsApi.list,
    enabled: open,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: gradeConventionsQueryKey })
    // Prefijo: refresca todas las planillas abiertas (leyenda y notas recalculadas).
    queryClient.invalidateQueries({ queryKey: ['grades-sheet'] })
  }

  const dirty = (conventions ?? []).filter((c) => drafts[c.id] && isDirty(c, drafts[c.id]))
  const invalid = dirty.filter((c) => !isValid(drafts[c.id]))

  const updateDraft = (convention: GradeConvention, changes: Partial<ConventionDraft>) =>
    setDrafts((prev) => ({ ...prev, [convention.id]: { ...(prev[convention.id] ?? draftOf(convention)), ...changes } }))

  const discardDraft = (id: number) =>
    setDrafts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })

  const handleOpenChange = (next: boolean) => {
    if (!next && dirty.length > 0 && !window.confirm('Tienes cambios sin guardar en las convenciones. ¿Cerrar sin guardar?')) {
      return
    }
    if (!next) setDrafts({})
    onOpenChange(next)
  }

  // Una por una: si una falla (p. ej. abreviatura repetida), las demás se guardan
  // igual y la que falló conserva su borrador para corregirla.
  const saveAll = async () => {
    setSaving(true)
    let saved = 0
    let valueChanged = false
    const errors: string[] = []
    for (const convention of dirty) {
      const draft = drafts[convention.id]
      const value = parseValue(draft.value) ?? null
      try {
        await gradeConventionsApi.update(convention.id, { code: draft.code.trim(), label: draft.label.trim(), value })
        saved++
        if (value !== (convention.value === null ? null : Number(convention.value))) valueChanged = true
        discardDraft(convention.id)
      } catch (error) {
        errors.push(`${draft.code.trim() || convention.code}: ${errorMessage(error, 'no se pudo guardar')}`)
      }
    }
    setSaving(false)
    invalidate()
    if (saved > 0) {
      toast.success(
        `${saved} ${saved === 1 ? 'convención guardada' : 'convenciones guardadas'}.` +
          (valueChanged ? ' Las notas que las usan se actualizaron.' : '')
      )
    }
    errors.forEach((message) => toast.error(message))
  }

  const addSuggested = useMutation({
    mutationFn: gradeConventionsApi.addSuggested,
    onSuccess: () => {
      toast.success('Convenciones sugeridas agregadas. Ponle nota a las que deban valer y guarda los cambios.')
      invalidate()
    },
    onError: () => toast.error('No pudimos agregar las sugeridas.'),
  })

  const reorder = useMutation({
    mutationFn: gradeConventionsApi.reorder,
    onSuccess: invalidate,
    onError: () => toast.error('No pudimos cambiar el orden.'),
  })

  const move = (index: number, delta: number) => {
    if (!conventions) return
    const ids = conventions.map((c) => c.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate(ids)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convenciones de calificación</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Escribe la abreviatura en la celda (o elígela de la lista) en vez de una nota. Si la dejas sin nota, no cuenta
          en el promedio.
        </p>

        <div className="flex flex-col gap-2">
          {conventions?.length === 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed px-3 py-3 text-sm">
              <span className="text-muted-foreground">Aún no tienes convenciones.</span>
              <Button size="sm" variant="outline" onClick={() => addSuggested.mutate()} disabled={addSuggested.isPending}>
                Agregar sugeridas (NP, NA, Su, Ok, ✓, ✗…)
              </Button>
            </div>
          )}
          {conventions?.map((c, index) => (
            <ConventionRow
              key={c.id}
              convention={c}
              draft={drafts[c.id] ?? draftOf(c)}
              dirty={!!drafts[c.id] && isDirty(c, drafts[c.id])}
              isFirst={index === 0}
              isLast={index === conventions.length - 1}
              onMove={(delta) => move(index, delta)}
              onChange={(changes) => updateDraft(c, changes)}
              onDeleted={() => {
                discardDraft(c.id)
                invalidate()
              }}
            />
          ))}
        </div>

        {!!conventions?.length && (
          <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-between gap-2 border-t bg-background px-6 py-3">
            <Button size="sm" variant="ghost" onClick={() => addSuggested.mutate()} disabled={addSuggested.isPending}>
              Agregar las sugeridas que falten
            </Button>
            <div className="flex items-center gap-2">
              {dirty.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setDrafts({})} disabled={saving}>
                  Descartar
                </Button>
              )}
              <Button size="sm" onClick={saveAll} disabled={dirty.length === 0 || invalid.length > 0 || saving}>
                {saving ? 'Guardando...' : `Guardar cambios${dirty.length > 0 ? ` (${dirty.length})` : ''}`}
              </Button>
            </div>
            {invalid.length > 0 && (
              <p className="w-full text-xs text-destructive">
                Revisa {invalid.map((c) => drafts[c.id].code || c.code).join(', ')}: falta la abreviatura o el
                significado, o la nota no está entre 1.0 y 10.0.
              </p>
            )}
          </div>
        )}

        <NewConventionForm onCreated={invalidate} />
      </DialogContent>
    </Dialog>
  )
}

function ConventionRow({
  convention,
  draft,
  dirty,
  isFirst,
  isLast,
  onMove,
  onChange,
  onDeleted,
}: {
  convention: GradeConvention
  draft: ConventionDraft
  dirty: boolean
  isFirst: boolean
  isLast: boolean
  onMove: (delta: number) => void
  onChange: (changes: Partial<ConventionDraft>) => void
  onDeleted: () => void
}) {
  const remove = useMutation({
    mutationFn: () => gradeConventionsApi.remove(convention.id),
    onSuccess: () => {
      toast.success('Convención eliminada.')
      onDeleted()
    },
    onError: (error) => toast.error(errorMessage(error, 'No pudimos eliminar la convención.')),
  })

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md border px-2 py-2 ${dirty ? 'border-primary/60 bg-primary/5' : ''}`}
    >
      <div className="flex flex-col">
        <button
          type="button"
          className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
          disabled={isFirst}
          onClick={() => onMove(-1)}
          aria-label="Subir"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="rounded p-0.5 hover:bg-muted disabled:opacity-30"
          disabled={isLast}
          onClick={() => onMove(1)}
          aria-label="Bajar"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <Input
        className="h-9 w-16 text-center font-semibold"
        maxLength={10}
        value={draft.code}
        onChange={(e) => onChange({ code: e.target.value })}
        aria-label="Abreviatura"
      />
      <Input
        className="h-9 min-w-[8rem] flex-1"
        maxLength={100}
        value={draft.label}
        onChange={(e) => onChange({ label: e.target.value })}
        aria-label="Significado"
      />
      <Input
        className="h-9 w-24 text-center"
        inputMode="decimal"
        placeholder="Sin nota"
        value={draft.value}
        onChange={(e) => onChange({ value: e.target.value })}
        aria-label="Nota"
      />
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled={remove.isPending}
        onClick={() => remove.mutate()}
        aria-label="Eliminar"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {parseValue(draft.value) === undefined && (
        <p className="w-full text-xs text-destructive">La nota debe estar entre 1.0 y 10.0.</p>
      )}
    </div>
  )
}

function NewConventionForm({ onCreated }: { onCreated: () => void }) {
  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')

  const parsedValue = parseValue(value)
  const valid = code.trim() !== '' && label.trim() !== '' && parsedValue !== undefined

  const create = useMutation({
    mutationFn: (payload: GradeConventionPayload) => gradeConventionsApi.create(payload),
    onSuccess: () => {
      toast.success('Convención creada.')
      setCode('')
      setLabel('')
      setValue('')
      onCreated()
    },
    onError: (error) => toast.error(errorMessage(error, 'No pudimos crear la convención.')),
  })

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase text-muted-foreground">Nueva convención</p>
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Abreviatura o ícono</Label>
          <Input
            className="h-9 w-24 text-center font-semibold"
            maxLength={10}
            placeholder="NP"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <div className="min-w-[10rem] flex-1 space-y-1">
          <Label className="text-xs">Significado</Label>
          <Input className="h-9" maxLength={100} placeholder="No presentó" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Nota (opcional)</Label>
          <Input
            className="h-9 w-24 text-center"
            inputMode="decimal"
            placeholder="Sin nota"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <Button
          size="sm"
          disabled={!valid || create.isPending}
          onClick={() => create.mutate({ code: code.trim(), label: label.trim(), value: parsedValue ?? null })}
        >
          Agregar
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="mr-1 text-xs text-muted-foreground">Íconos:</span>
        {ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => setCode(icon)}
            className={`h-8 w-8 rounded-md border text-base hover:bg-muted ${code === icon ? 'border-primary bg-primary/10' : ''}`}
          >
            {icon}
          </button>
        ))}
      </div>
      {parsedValue === undefined && <p className="text-xs text-destructive">La nota debe estar entre 1.0 y 10.0.</p>}
    </div>
  )
}
