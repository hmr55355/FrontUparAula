import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { institutionsApi } from '@/services/api/institutions'
import { periodsApi } from '@/services/api/periods'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { Badge } from '@/components/ui/badge'
import axios from 'axios'
import type { AcademicYear, Period } from '@/types'

export function AcademicYearSettings() {
  const { data: institution } = useCurrentInstitution()
  const queryClient = useQueryClient()
  const [selectedYearId, setSelectedYearId] = useState<number | ''>('')
  const [newYear, setNewYear] = useState('')
  const [newYearStart, setNewYearStart] = useState('')
  const [newYearEnd, setNewYearEnd] = useState('')
  const [newPeriodName, setNewPeriodName] = useState('')
  const [newPeriodStart, setNewPeriodStart] = useState('')
  const [newPeriodEnd, setNewPeriodEnd] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', institution?.id],
    queryFn: () => institutionsApi.academicYears(institution!.id),
    enabled: !!institution,
  })

  useEffect(() => {
    if (selectedYearId === '' && academicYears && academicYears.length > 0) {
      setSelectedYearId(academicYears.find((y) => y.is_active)?.id ?? academicYears[0].id)
    }
  }, [academicYears, selectedYearId])

  const selectedYear = academicYears?.find((y) => y.id === selectedYearId)

  const { data: periods } = useQuery({
    queryKey: ['periods', selectedYearId],
    queryFn: () => periodsApi.list(selectedYearId as number),
    enabled: !!selectedYearId,
  })

  const createYear = async () => {
    if (!institution || !newYear || !newYearStart || !newYearEnd) {
      toast.error('Completa el año y las fechas.')
      return
    }
    setSaving(true)
    try {
      await institutionsApi.createAcademicYear({
        institution_id: institution.id, year: Number(newYear), start_date: newYearStart, end_date: newYearEnd,
      })
      queryClient.invalidateQueries({ queryKey: ['academic-years', institution.id] })
      setNewYear('')
      setNewYearStart('')
      setNewYearEnd('')
      toast.success('Año lectivo creado.')
    } catch {
      toast.error('No pudimos crear el año lectivo.')
    } finally {
      setSaving(false)
    }
  }

  const createPeriod = async () => {
    if (!selectedYearId || !newPeriodName || !newPeriodStart || !newPeriodEnd) {
      toast.error('Completa el nombre y las fechas del período.')
      return
    }
    setSaving(true)
    try {
      const nextNumber = (periods?.length ?? 0) + 1
      await periodsApi.create({
        academic_year_id: selectedYearId, number: nextNumber, name: newPeriodName,
        start_date: newPeriodStart, end_date: newPeriodEnd,
      })
      queryClient.invalidateQueries({ queryKey: ['periods', selectedYearId] })
      setNewPeriodName('')
      setNewPeriodStart('')
      setNewPeriodEnd('')
      toast.success('Período creado.')
    } catch {
      toast.error('No pudimos crear el período.')
    } finally {
      setSaving(false)
    }
  }

  const setActive = async (periodId: number) => {
    try {
      await periodsApi.setActive(periodId)
      queryClient.invalidateQueries({ queryKey: ['periods', selectedYearId] })
      toast.success('Período activo actualizado.')
    } catch {
      toast.error('No pudimos activar el período.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Años lectivos</CardTitle>
          <CardDescription>Gestiona los años lectivos de tu institución</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <select
            className="h-10 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(Number(e.target.value))}
          >
            {academicYears?.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year} {y.is_active ? '(activo)' : ''}
              </option>
            ))}
          </select>

          {selectedYear && <YearControls key={`${selectedYear.id}-${selectedYear.start_date}-${selectedYear.end_date}-${selectedYear.is_active}`} year={selectedYear} />}

          <p className="text-xs font-semibold uppercase text-muted-foreground">Nuevo año lectivo</p>
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Año (ej. 2027)" type="number" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
            <Input type="date" value={newYearStart} onChange={(e) => setNewYearStart(e.target.value)} />
            <Input type="date" value={newYearEnd} onChange={(e) => setNewYearEnd(e.target.value)} />
          </div>
          <Button size="sm" variant="outline" className="w-fit" onClick={createYear} disabled={saving}>
            Crear año lectivo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Períodos</CardTitle>
          <CardDescription>Fechas de inicio/fin y período activo del año seleccionado</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {periods?.map((p) => (
            <PeriodRow key={`${p.id}-${p.name}-${p.start_date}-${p.end_date}-${p.is_closed}`} period={p} onActivate={setActive} />
          ))}
          {periods?.length === 0 && <p className="text-sm text-muted-foreground">Sin períodos para este año.</p>}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={newPeriodName} onChange={(e) => setNewPeriodName(e.target.value)} placeholder="Tercer Período" />
            </div>
            <div className="space-y-1">
              <Label>Inicio</Label>
              <Input type="date" value={newPeriodStart} onChange={(e) => setNewPeriodStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fin</Label>
              <Input type="date" value={newPeriodEnd} onChange={(e) => setNewPeriodEnd(e.target.value)} />
            </div>
          </div>
          <Button size="sm" variant="outline" className="w-fit" onClick={createPeriod} disabled={saving || !selectedYearId}>
            Crear período
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Un período: nombre y fechas editables, activar, y cerrar/reabrir. Cerrado, el
 * backend rechaza cualquier cambio de notas en él (la planilla queda en solo lectura).
 */
function PeriodRow({ period, onActivate }: { period: Period; onActivate: (id: number) => void }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(period.name)
  const [start, setStart] = useState(period.start_date.slice(0, 10))
  const [end, setEnd] = useState(period.end_date.slice(0, 10))
  const [saving, setSaving] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['periods'] })
    queryClient.invalidateQueries({ queryKey: ['grades-sheet'] })
  }

  const errorText = (error: unknown, fallback: string) =>
    (axios.isAxiosError(error) &&
      (error.response?.data?.errors?.start_date?.[0] || error.response?.data?.errors?.end_date?.[0] || error.response?.data?.message)) ||
    fallback

  const save = async () => {
    if (!name.trim() || !start || !end) {
      toast.error('Completa el nombre y las fechas.')
      return
    }
    setSaving(true)
    try {
      await periodsApi.update(period.id, { name: name.trim(), start_date: start, end_date: end })
      toast.success('Período actualizado.')
      setEditing(false)
      invalidate()
    } catch (error) {
      toast.error(errorText(error, 'No pudimos actualizar el período.'))
    } finally {
      setSaving(false)
    }
  }

  const toggleClosed = async () => {
    const closing = !period.is_closed
    const message = closing
      ? `¿Cerrar "${period.name}"? Nadie podrá registrar ni cambiar notas de ese período hasta que lo reabras.`
      : `¿Reabrir "${period.name}"? Los docentes podrán volver a cambiar sus notas.`
    if (!window.confirm(message)) return
    setSaving(true)
    try {
      await periodsApi.update(period.id, { is_closed: closing })
      toast.success(closing ? 'Período cerrado.' : 'Período reabierto.')
      invalidate()
    } catch (error) {
      toast.error(errorText(error, 'No pudimos cambiar el estado del período.'))
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Inicio</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Fin</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Cambiar las fechas cambia a qué período pertenecen la asistencia y las notas de esos días.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
      <div>
        <div className="flex items-center gap-2 font-medium">
          {period.name}
          {period.is_active && <Badge>Activo</Badge>}
          {period.is_closed && <Badge variant="secondary">🔒 Cerrado</Badge>}
        </div>
        <p className="text-muted-foreground">
          {period.start_date.slice(0, 10)} — {period.end_date.slice(0, 10)}
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={saving}>
          Editar
        </Button>
        <Button size="sm" variant="ghost" onClick={toggleClosed} disabled={saving}>
          {period.is_closed ? 'Reabrir' : 'Cerrar'}
        </Button>
        {!period.is_active && (
          <Button size="sm" variant="outline" onClick={() => onActivate(period.id)} disabled={saving}>
            Activar
          </Button>
        )}
      </div>
    </div>
  )
}

/** Fechas del año seleccionado y "Activar este año" (el backend deja un solo año activo). */
function YearControls({ year }: { year: AcademicYear }) {
  const queryClient = useQueryClient()
  const [start, setStart] = useState(year.start_date.slice(0, 10))
  const [end, setEnd] = useState(year.end_date.slice(0, 10))
  const [saving, setSaving] = useState(false)
  const changed = start !== year.start_date.slice(0, 10) || end !== year.end_date.slice(0, 10)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['academic-years'] })

  const saveDates = async () => {
    setSaving(true)
    try {
      await institutionsApi.updateAcademicYear(year.id, { start_date: start, end_date: end })
      toast.success('Fechas del año actualizadas.')
      invalidate()
    } catch (error) {
      toast.error((axios.isAxiosError(error) && error.response?.data?.message) || 'No pudimos guardar las fechas.')
    } finally {
      setSaving(false)
    }
  }

  const activate = async () => {
    if (!window.confirm(`¿Activar el año ${year.year}? El año activo actual dejará de estarlo.`)) return
    setSaving(true)
    try {
      await institutionsApi.setActiveAcademicYear(year.id)
      toast.success(`Año ${year.year} activado.`)
      invalidate()
      queryClient.invalidateQueries({ queryKey: ['group-subjects'] })
    } catch {
      toast.error('No pudimos activar el año.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border p-3">
      <div className="space-y-1">
        <Label className="text-xs">Inicio del año {year.year}</Label>
        <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Fin</Label>
        <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      {changed && (
        <Button size="sm" onClick={saveDates} disabled={saving}>
          Guardar fechas
        </Button>
      )}
      {year.is_active ? (
        <Badge className="ml-auto">Año activo</Badge>
      ) : (
        <Button size="sm" variant="outline" className="ml-auto" onClick={activate} disabled={saving}>
          Activar este año
        </Button>
      )}
    </div>
  )
}

