import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { institutionsApi } from '@/services/api/institutions'
import { studentImportApi, type StudentImportResult } from '@/services/api/studentImport'
import { exportApi } from '@/services/api/export'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'

export function ImportExport() {
  const { data: institution } = useCurrentInstitution()
  const [groupId, setGroupId] = useState<number | ''>('')
  const [yearId, setYearId] = useState<number | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<StudentImportResult | null>(null)

  const { data: groups } = useQuery({
    queryKey: ['groups', institution?.id],
    queryFn: () => institutionsApi.groups(institution!.id),
    enabled: !!institution,
  })

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', institution?.id],
    queryFn: () => institutionsApi.academicYears(institution!.id),
    enabled: !!institution,
  })

  useEffect(() => {
    if (groupId === '' && groups && groups.length > 0) setGroupId(groups[0].id)
  }, [groups, groupId])

  useEffect(() => {
    if (yearId === '' && academicYears && academicYears.length > 0) {
      setYearId(academicYears.find((y) => y.is_active)?.id ?? academicYears[0].id)
    }
  }, [academicYears, yearId])

  const runImport = async () => {
    if (!groupId || !file) {
      toast.error('Selecciona un grupo y un archivo .xlsx.')
      return
    }
    setImporting(true)
    setResult(null)
    try {
      const response = await studentImportApi.import(groupId, file)
      setResult(response)
      toast.success(`${response.created} estudiantes importados.`)
    } catch (error) {
      const message = (axios.isAxiosError(error) && error.response?.data?.message) || 'No pudimos importar el archivo.'
      toast.error(message)
    } finally {
      setImporting(false)
    }
  }

  const runExport = async () => {
    if (!yearId) return
    setExporting(true)
    try {
      const blob = await exportApi.yearData(yearId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `uparaula-${yearId}.json`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('No pudimos generar la exportación.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Importar estudiantes</CardTitle>
          <CardDescription>
            Sube un .xlsx con una fila de encabezados que incluya al menos "Apellidos" y "Nombres" — acepta la
            plantilla simple (Apellidos, Nombres, Tipo documento, Número documento, Email) o un export de
            matrícula/SIMAT con columnas de sobra en otro orden.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <SearchableSelect value={groupId} onChange={setGroupId} options={(groups ?? []).map((g) => ({ id: g.id, label: g.name }))} />
          <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button size="sm" variant="outline" className="w-fit" onClick={runImport} disabled={importing}>
            {importing ? 'Importando...' : 'Importar'}
          </Button>
          {result && (
            <p className="text-sm text-muted-foreground">
              {result.created} creados, {result.skipped} omitidos.
              {result.errors.length > 0 && ` ${result.errors.length} errores.`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exportar datos del año</CardTitle>
          <CardDescription>Descarga un JSON con grupos, materias, estudiantes y calificaciones del año</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <select
            className="h-10 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={yearId}
            onChange={(e) => setYearId(Number(e.target.value))}
          >
            {academicYears?.map((y) => (
              <option key={y.id} value={y.id}>
                {y.year}
              </option>
            ))}
          </select>
          <Button size="sm" variant="outline" className="w-fit" onClick={runExport} disabled={exporting}>
            {exporting ? 'Generando...' : 'Descargar JSON'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
