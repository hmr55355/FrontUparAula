import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { institutionsApi } from '@/services/api/institutions'
import { periodsApi } from '@/services/api/periods'
import { reportsApi } from '@/services/api/reports'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { useReportGeneration } from '@/hooks/useReportGeneration'
import type { ReportFormat } from '@/types/reports'

export function BehaviorCitationsReportDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: institution } = useCurrentInstitution()
  const { course } = useActiveCourseGroup()
  const [groupId, setGroupId] = useState<number | ''>('')
  const [periodId, setPeriodId] = useState<number | ''>('')
  const [format, setFormat] = useState<ReportFormat>('excel')
  const { generate, isGenerating } = useReportGeneration()

  const { data: groups } = useQuery({
    queryKey: ['groups', institution?.id],
    queryFn: () => institutionsApi.groups(institution!.id),
    enabled: !!institution && open,
  })

  useEffect(() => {
    if (groupId === '' && groups && groups.length > 0) {
      setGroupId(course?.group_id && groups.some((g) => g.id === course.group_id) ? course.group_id : groups[0].id)
    }
  }, [groups, course, groupId])

  const selectedGroup = groups?.find((g) => g.id === groupId)
  const { data: periods } = useQuery({
    queryKey: ['periods', selectedGroup?.academic_year_id],
    queryFn: () => periodsApi.list(selectedGroup!.academic_year_id),
    enabled: !!selectedGroup,
  })

  useEffect(() => {
    if (periodId === '' && periods && periods.length > 0) {
      setPeriodId(periods.find((p) => p.is_active)?.id ?? periods[0].id)
    }
  }, [periods, periodId])

  const canGenerate = !!groupId && !!periodId

  const onGenerate = () => {
    if (!groupId || !periodId) return
    generate(
      () => reportsApi.createBehaviorCitations({ group_id: groupId, period_id: periodId, format }),
      'reporte-de-comportamiento-y-citaciones'
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comportamiento y citaciones</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Grupo</Label>
            <SearchableSelect
              value={groupId}
              onChange={(id) => {
                setGroupId(id)
                setPeriodId('')
              }}
              options={(groups ?? []).map((g) => ({ id: g.id, label: g.name }))}
            />
          </div>

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
