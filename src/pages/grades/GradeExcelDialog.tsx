import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { FileSpreadsheet, FileText, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { gradesApi } from '@/services/api/grades'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'
import { downloadFromApi } from '@/utils/download'

type ImportResult = { saved: number; skipped: number; errors: string[] }
type Download = 'blank' | 'excel' | 'pdf'

/**
 * La planilla en Excel, todo en un lugar:
 * - "Sin notas": plantilla del curso y período (estudiantes y una columna por
 *   actividad) para llenarla y subirla aquí mismo.
 * - "Con notas": la planilla completa con notas y definitivas, para imprimir o
 *   archivar (también en PDF). Esa no se puede volver a subir.
 * Al subir, las celdas vacías se omiten: una plantilla a medias no borra notas.
 */
export function GradeExcelDialog({
  open,
  onOpenChange,
  groupSubjectId,
  periodId,
  fileLabel,
  locked = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupSubjectId: number
  periodId: number
  fileLabel: string
  /** Período cerrado: se puede descargar, pero no subir notas. */
  locked?: boolean
}) {
  const queryClient = useQueryClient()
  const [downloading, setDownloading] = useState<Download | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const download = async (kind: Download) => {
    setDownloading(kind)
    try {
      if (kind === 'blank') {
        await downloadFromApi('/grades/excel-template', { groupSubjectId, periodId }, `planilla-sin-notas-${fileLabel}.xlsx`)
      } else {
        await downloadFromApi(
          '/grades/export',
          { groupSubjectId, periodId, format: kind },
          `planilla-${fileLabel}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`
        )
      }
    } catch {
      toast.error('No pudimos generar el archivo.')
    } finally {
      setDownloading(null)
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
          <DialogTitle>Planilla en Excel</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Descargar</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => download('blank')}
                disabled={!!downloading}
                className="flex flex-col gap-1 rounded-md border p-3 text-left hover:border-primary hover:bg-primary/5 disabled:opacity-60"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  {downloading === 'blank' ? 'Generando...' : 'Planilla sin notas'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Tus estudiantes y una columna por actividad, para llenarla y subirla aquí.
                </span>
              </button>
              <button
                type="button"
                onClick={() => download('excel')}
                disabled={!!downloading}
                className="flex flex-col gap-1 rounded-md border p-3 text-left hover:border-primary hover:bg-primary/5 disabled:opacity-60"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  {downloading === 'excel' ? 'Generando...' : 'Planilla con notas'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Todas las notas y definitivas del período, para imprimir o archivar.
                </span>
              </button>
            </div>
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => download('pdf')} disabled={!!downloading}>
              <FileText className="h-4 w-4" /> {downloading === 'pdf' ? 'Generando...' : 'Planilla con notas en PDF'}
            </Button>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <p className="text-sm font-medium">Subir notas</p>
            {locked ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                🔒 Este período está cerrado: no se pueden subir notas.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Sube la <strong>planilla sin notas</strong> ya llena (la "con notas" no sirve para subir). En cada
                  celda va la nota (de 1.0 a la nota máxima) o la abreviatura de una de tus convenciones (NP, ✓…, en la
                  hoja "Convenciones"). No cambies los nombres ni el orden de las filas. Las celdas vacías no se
                  tocan; si una actividad ya tenía nota, se reemplaza por la del archivo.
                </p>
                <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                <Button size="sm" className="w-fit" onClick={upload} disabled={!file || importing}>
                  <Upload className="h-4 w-4" /> {importing ? 'Cargando...' : 'Cargar notas'}
                </Button>
              </>
            )}
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
