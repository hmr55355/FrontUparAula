import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { institutionsApi } from '@/services/api/institutions'
import { periodsApi } from '@/services/api/periods'
import { reportsApi } from '@/services/api/reports'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useReportGeneration } from '@/hooks/useReportGeneration'
import type { ReportFormat } from '@/types/reports'

export function AcademicRiskReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: institution } = useCurrentInstitution()
  const [periodId, setPeriodId] = useState<number | ''>('')
  const [format, setFormat] = useState<ReportFormat>('excel')
  const { generate, isGenerating } = useReportGeneration()

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', institution?.id],
    queryFn: () => institutionsApi.academicYears(institution!.id),
    enabled: !!institution && open,
  })
  const activeYear = academicYears?.find((y) => y.is_active) ?? academicYears?.[0]

  const { data: periods } = useQuery({
    queryKey: ['periods', activeYear?.id],
    queryFn: () => periodsApi.list(activeYear!.id),
    enabled: !!activeYear,
  })

  useEffect(() => {
    if (periodId === '' && periods && periods.length > 0) {
      setPeriodId(periods.find((p) => p.is_active)?.id ?? periods[0].id)
    }
  }, [periods, periodId])

  const canGenerate = !!institution && !!periodId

  const onGenerate = () => {
    if (!institution || !periodId) return
    generate(
      () => reportsApi.createAcademicRisk({ institution_id: institution.id, period_id: periodId, format }),
      'reporte-de-riesgo-academico'
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Riesgo académico</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
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

        <DialogFooter>
          <Button onClick={onGenerate} disabled={!canGenerate || isGenerating}>
            {isGenerating ? 'Generando...' : 'Generar reporte'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
