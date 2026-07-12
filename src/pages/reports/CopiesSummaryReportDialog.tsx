import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { institutionsApi } from '@/services/api/institutions'
import { periodsApi } from '@/services/api/periods'
import { copyChargesApi } from '@/services/api/copyCharges'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { useReportGeneration } from '@/hooks/useReportGeneration'

export function CopiesSummaryReportDialog({
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

  const canGenerate = !!groupId

  const onGenerate = () => {
    if (!groupId) return
    generate(
      () => copyChargesApi.summary({ group_id: groupId, period_id: periodId || undefined }),
      'resumen-general-de-copias'
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resumen general de copias</DialogTitle>
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
              onChange={(e) => setPeriodId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Todos los períodos</option>
              {periods?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onGenerate} disabled={!canGenerate || isGenerating}>
            {isGenerating ? 'Generando...' : 'Generar reporte (Excel)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
