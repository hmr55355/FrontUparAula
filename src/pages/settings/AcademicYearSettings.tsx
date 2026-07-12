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
            <div key={p.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-muted-foreground">
                  {p.start_date.slice(0, 10)} — {p.end_date.slice(0, 10)}
                </p>
              </div>
              {p.is_active ? (
                <span className="text-xs font-medium text-primary">Activo</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setActive(p.id)}>
                  Activar
                </Button>
              )}
            </div>
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
