import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { institutionsApi } from '@/services/api/institutions'
import { periodsApi } from '@/services/api/periods'
import { groupsApi } from '@/services/api/groups'
import { reportsApi } from '@/services/api/reports'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { useReportGeneration } from '@/hooks/useReportGeneration'

export function StudentBulletinReportDialog({
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
  const [studentId, setStudentId] = useState<number | ''>('')
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

  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => groupsApi.students(groupId as number),
    enabled: !!groupId,
  })

  useEffect(() => {
    if (periodId === '' && periods && periods.length > 0) {
      setPeriodId(periods.find((p) => p.is_active)?.id ?? periods[0].id)
    }
  }, [periods, periodId])

  useEffect(() => {
    if (studentId === '' && students && students.length > 0) {
      setStudentId(students[0].id)
    }
  }, [students, studentId])

  const canGenerate = !!studentId && !!periodId

  const onGenerate = () => {
    if (!studentId || !periodId) return
    generate(() => reportsApi.createStudentBulletin({ student_id: studentId, period_id: periodId }), 'boletin-individual')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Boletín individual</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Grupo</Label>
            <SearchableSelect
              value={groupId}
              onChange={(id) => {
                setGroupId(id)
                setPeriodId('')
                setStudentId('')
              }}
              options={(groups ?? []).map((g) => ({ id: g.id, label: g.name }))}
            />
          </div>

          <div className="space-y-1">
            <Label>Estudiante</Label>
            <SearchableSelect
              value={studentId}
              onChange={setStudentId}
              options={(students ?? []).map((s) => ({ id: s.id, label: `${s.last_name} ${s.first_name}` }))}
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
        </div>

        <DialogFooter>
          <Button onClick={onGenerate} disabled={!canGenerate || isGenerating}>
            {isGenerating ? 'Generando...' : 'Generar boletín (PDF)'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
