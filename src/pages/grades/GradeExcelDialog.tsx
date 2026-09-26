import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Download, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { gradesApi } from '@/services/api/grades'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'

type ImportResult = { saved: number; skipped: number; errors: string[] }

/**
 * Cargue de notas desde Excel en dos pasos: descargar la plantilla del curso y
 * período (ya trae los estudiantes y una columna por actividad) y subirla llena.
 * Las celdas vacías se omiten, así que subir la plantilla a medias no borra notas.
 */
export function GradeExcelDialog({
  open,
  onOpenChange,
  groupSubjectId,
  periodId,
  fileLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupSubjectId: number
  periodId: number
  fileLabel: string
}) {
  const queryClient = useQueryClient()
  const [downloading, setDownloading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const download = async () => {
    setDownloading(true)
    try {
      const blob = await gradesApi.excelTemplate(groupSubjectId, periodId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `notas-${fileLabel}.xlsx`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('No pudimos generar la plantilla.')
    } finally {
      setDownloading(false)
    }
  }

  const upload = async () => {
    if (!file) return
    setImporting(true)
    setResult(null)
    try {
      const response = await gradesApi.excelImport(groupSubjectId, periodId, file)
      setResult(response)
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
      toast.success(`${response.saved} notas cargadas.`)
    } catch (error) {
      const message = (axios.isAxiosError(error) && error.response?.data?.message) || 'No pudimos cargar el archivo.'
      toast.error(message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar notas desde Excel</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">1. Descarga la plantilla</p>
            <p className="text-sm text-muted-foreground">
              Trae tus estudiantes y una columna por cada actividad de este período. Llena solo las notas (de 1.0 a la
              nota máxima) o la abreviatura de una de tus convenciones (NP, ✓…, listadas en la hoja "Convenciones");
              no cambies los nombres ni el orden de las filas.
            </p>
            <Button variant="outline" size="sm" className="w-fit" onClick={download} disabled={downloading}>
              <Download className="h-4 w-4" /> {downloading ? 'Generando...' : 'Descargar plantilla'}
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-sm font-medium">2. Sube la plantilla con las notas</p>
            <p className="text-sm text-muted-foreground">
              Las celdas vacías no se tocan. Si una actividad ya tenía nota, se reemplaza por la del archivo.
            </p>
            <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button size="sm" className="w-fit" onClick={upload} disabled={!file || importing}>
              <Upload className="h-4 w-4" /> {importing ? 'Cargando...' : 'Cargar notas'}
            </Button>
          </div>

          {result && (
            <div className="rounded-md border p-3 text-sm">
              <p>
                <strong>{result.saved}</strong> notas cargadas, {result.skipped} celdas vacías omitidas.
              </p>
              {result.errors.length > 0 && (
                <>
                  <p className="mt-2 font-medium text-danger">{result.errors.length} celdas con problemas (no se guardaron):</p>
                  <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5 text-muted-foreground">
                    {result.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
