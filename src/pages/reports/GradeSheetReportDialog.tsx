import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { periodsApi } from '@/services/api/periods'
import { reportsApi } from '@/services/api/reports'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { useReportGeneration } from '@/hooks/useReportGeneration'
import type { ReportFormat } from '@/types/reports'

export function GradeSheetReportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { course } = useActiveCourseGroup()
  const [periodId, setPeriodId] = useState<number | ''>('')
  const [format, setFormat] = useState<ReportFormat>('excel')
  const { generate, isGenerating } = useReportGeneration()

  const { data: periods } = useQuery({
    queryKey: ['periods', course?.academic_year_id],
    queryFn: () => periodsApi.list(course!.academic_year_id),
    enabled: !!course && open,
  })

  useEffect(() => {
    if (periodId === '' && periods && periods.length > 0) {
      setPeriodId(periods.find((p) => p.is_active)?.id ?? periods[0].id)
    }
  }, [periods, periodId])

  const canGenerate = !!course && !!periodId

  const onGenerate = () => {
    if (!course || !periodId) return
    generate(
      () => reportsApi.createGradeSheet({ group_subject_id: course.id, period_id: periodId, format }),
      'planilla-de-calificaciones'
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Planilla de calificaciones</DialogTitle>
        </DialogHeader>

        {!course ? (
          <p className="text-sm text-muted-foreground">
            Selecciona un curso activo en el encabezado para generar su planilla.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {course.subject?.name} — {course.group?.name}
            </p>
            <div className="space-y-1">
              <Label>Período</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={periodId}
                onChange={(e) => setPeriodId(Number(e.target.value))}
              >
                {periods?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Formato</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={format === 'excel' ? 'default' : 'outline'}
                  onClick={() => setFormat('excel')}
                >
                  Excel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={format === 'pdf' ? 'default' : 'outline'}
                  onClick={() => setFormat('pdf')}
                >
                  PDF
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onGenerate} disabled={!canGenerate || isGenerating}>
            {isGenerating ? 'Generando...' : 'Generar reporte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
