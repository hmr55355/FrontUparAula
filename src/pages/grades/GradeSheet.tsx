import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarCheck, Copy, RefreshCw, Settings } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { gradesApi } from '@/services/api/grades'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { periodsApi } from '@/services/api/periods'
import { GradeSheetTable } from '@/pages/grades/GradeSheetTable'
import { GradeSheetMobile } from '@/pages/grades/GradeSheetMobile'
import { ConfigureSheetDialog } from '@/pages/grades/ConfigureSheetDialog'
import { TakeAttendanceDialog } from '@/pages/grades/TakeAttendanceDialog'
import { CopyPaymentsDialog } from '@/pages/grades/CopyPaymentsDialog'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'

export function GradeSheet() {
  const { groupSubjectId, periodId } = useParams<{ groupSubjectId: string; periodId: string }>()
  const gsId = Number(groupSubjectId)
  const pId = Number(periodId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [configureOpen, setConfigureOpen] = useState(false)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [copiesOpen, setCopiesOpen] = useState(false)

  const { data: courses } = useQuery({ queryKey: ['group-subjects', 'mine'], queryFn: groupSubjectsApi.myCourses })
  const course = courses?.find((c) => c.id === gsId)

  const { data: periods } = useQuery({
    queryKey: ['periods', course?.academic_year_id],
    queryFn: () => periodsApi.list(course!.academic_year_id),
    enabled: !!course,
  })

  const { data: sheet, isLoading } = useQuery({
    queryKey: gradeSheetQueryKey(gsId, pId),
    queryFn: () => gradesApi.sheet(gsId, pId),
    enabled: !!gsId && !!pId,
  })

  const recalculate = async () => {
    try {
      await gradesApi.recalculate(gsId, pId)
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(gsId, pId) })
      toast.success('Definitivas recalculadas.')
    } catch {
      toast.error('No pudimos recalcular las definitivas.')
    }
  }

  if (isLoading || !sheet) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            {course?.group?.name} — {course?.subject?.name}
          </h1>
          <p className="text-sm text-muted-foreground">Planilla de calificaciones</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={pId}
            onChange={(e) => navigate(`/grades/${gsId}/${e.target.value}`)}
          >
            {periods?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={() => setAttendanceOpen(true)}>
            <CalendarCheck className="h-4 w-4" /> Tomar asistencia
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCopiesOpen(true)}>
            <Copy className="h-4 w-4" /> Pagos de copias
          </Button>
          <Button variant="outline" size="sm" onClick={recalculate}>
            <RefreshCw className="h-4 w-4" /> Calcular definitivas
          </Button>
          <Button size="sm" onClick={() => setConfigureOpen(true)}>
            <Settings className="h-4 w-4" /> Configurar planilla
          </Button>
        </div>
      </div>

      {sheet.sections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-medium">Esta planilla no tiene secciones configuradas todavía.</p>
            <p className="text-sm text-muted-foreground">
              Configura las secciones y columnas para empezar a registrar notas, o carga una plantilla existente.
            </p>
            <Button onClick={() => setConfigureOpen(true)}>Configurar planilla</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <GradeSheetTable sheet={sheet} groupSubjectId={gsId} periodId={pId} />
          <GradeSheetMobile sheet={sheet} groupSubjectId={gsId} periodId={pId} />
        </>
      )}

      {course && (
        <ConfigureSheetDialog
          open={configureOpen}
          onOpenChange={setConfigureOpen}
          sheet={sheet}
          groupSubjectId={gsId}
          periodId={pId}
          institutionId={course.institution_id}
        />
      )}

      <TakeAttendanceDialog
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        groupSubjectId={gsId}
        periodId={pId}
      />

      {course && <CopyPaymentsDialog open={copiesOpen} onOpenChange={setCopiesOpen} groupId={course.group_id} />}
    </div>
  )
}
