import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { CalendarCheck, Copy, FileSpreadsheet, RefreshCw, Settings, Tags } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { gradesApi } from '@/services/api/grades'
import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { periodsApi } from '@/services/api/periods'
import { gradeSectionsApi } from '@/services/api/gradeSections'
import { GradeSheetTable } from '@/pages/grades/GradeSheetTable'
import { GradeSheetMobile } from '@/pages/grades/GradeSheetMobile'
import { ConfigureSheetDialog } from '@/pages/grades/ConfigureSheetDialog'
import { TakeAttendanceDialog } from '@/pages/grades/TakeAttendanceDialog'
import { CopyPaymentsDialog } from '@/pages/grades/CopyPaymentsDialog'
import { GradeExcelDialog } from '@/pages/grades/GradeExcelDialog'
import { ConventionsDialog } from '@/pages/grades/ConventionsDialog'
import { ConventionsLegend } from '@/pages/grades/conventions'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'
import { useActiveCourseStore } from '@/store/activeCourseStore'

export function GradeSheet() {
  const { groupSubjectId, periodId } = useParams<{ groupSubjectId: string; periodId: string }>()
  const gsId = Number(groupSubjectId)
  const pId = Number(periodId)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [configureOpen, setConfigureOpen] = useState(false)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const [copiesOpen, setCopiesOpen] = useState(false)
  const [excelOpen, setExcelOpen] = useState(false)
  const [conventionsOpen, setConventionsOpen] = useState(false)

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

  // Cambiar de curso en el selector del encabezado abre la planilla de ese
  // curso. Solo se reacciona a *cambios* del curso activo (no al montar), para
  // no sacar al docente de una planilla abierta por URL o desde el Dashboard.
  const activeCourseId = useActiveCourseStore((s) => s.activeCourse?.groupSubjectId)
  const previousActiveCourseId = useRef(activeCourseId)
  useEffect(() => {
    if (activeCourseId === previousActiveCourseId.current) return
    previousActiveCourseId.current = activeCourseId
    if (!activeCourseId || activeCourseId === gsId || !courses) return

    const target = courses.find((c) => c.id === activeCourseId)
    if (!target) return

    // Todos los cursos del mismo año lectivo comparten períodos: se conserva el
    // período que se está viendo. Si el curso es de otro año, se usa su período activo.
    if (target.academic_year_id === course?.academic_year_id) {
      navigate(`/grades/${target.id}/${pId}`)
      return
    }
    periodsApi.list(target.academic_year_id).then((targetPeriods) => {
      const active = targetPeriods.find((p) => p.is_active) ?? targetPeriods[0]
      if (active) navigate(`/grades/${target.id}/${active.id}`)
    })
  }, [activeCourseId, gsId, pId, courses, course?.academic_year_id, navigate])

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
          <Button variant="outline" size="sm" onClick={() => setExcelOpen(true)} disabled={sheet.sections.length === 0}>
            <FileSpreadsheet className="h-4 w-4" /> Notas desde Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => setConventionsOpen(true)}>
            <Tags className="h-4 w-4" /> Convenciones
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
            {periods && periods.length > 1 && (
              <CopyFromPeriod
                groupSubjectId={gsId}
                toPeriodId={pId}
                periods={periods.filter((p) => p.id !== pId)}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <ConventionsLegend
            conventions={sheet.conventions}
            minPassing={sheet.min_passing_grade}
            onManage={() => setConventionsOpen(true)}
          />
          <GradeSheetTable key={`table-${gsId}-${pId}`} sheet={sheet} groupSubjectId={gsId} periodId={pId} />
          <GradeSheetMobile key={`mobile-${gsId}-${pId}`} sheet={sheet} groupSubjectId={gsId} periodId={pId} />
        </>
      )}

      {course && (
        <ConfigureSheetDialog
          key={`configure-${gsId}-${pId}`}
          open={configureOpen}
          onOpenChange={setConfigureOpen}
          sheet={sheet}
          groupSubjectId={gsId}
          periodId={pId}
          institutionId={course.institution_id}
        />
      )}

      <TakeAttendanceDialog
        key={`attendance-${gsId}-${pId}`}
        open={attendanceOpen}
        onOpenChange={setAttendanceOpen}
        groupSubjectId={gsId}
      />

      <GradeExcelDialog
        key={`excel-${gsId}-${pId}`}
        open={excelOpen}
        onOpenChange={setExcelOpen}
        groupSubjectId={gsId}
        periodId={pId}
        fileLabel={`${course?.group?.name ?? ''}-${course?.subject?.name ?? ''}`}
      />

      <ConventionsDialog open={conventionsOpen} onOpenChange={setConventionsOpen} />

      {course && <CopyPaymentsDialog open={copiesOpen} onOpenChange={setCopiesOpen} groupId={course.group_id} />}
    </div>
  )
}

/**
 * En una planilla vacía: copiar secciones y columnas (sin notas) de otro período
 * del mismo curso. El backend solo lo permite si este período no tiene nada.
 */
function CopyFromPeriod({
  groupSubjectId,
  toPeriodId,
  periods,
}: {
  groupSubjectId: number
  toPeriodId: number
  periods: { id: number; name: string }[]
}) {
  const queryClient = useQueryClient()
  const [fromPeriodId, setFromPeriodId] = useState<number | ''>('')
  const [copying, setCopying] = useState(false)

  const copy = async () => {
    if (!fromPeriodId) return
    setCopying(true)
    try {
      await gradeSectionsApi.copyFromPeriod({
        group_subject_id: groupSubjectId,
        from_period_id: fromPeriodId,
        to_period_id: toPeriodId,
      })
      toast.success('Configuración copiada. Revisa las fechas de las actividades.')
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, toPeriodId) })
    } catch (error) {
      toast.error((axios.isAxiosError(error) && error.response?.data?.message) || 'No pudimos copiar la configuración.')
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 border-t pt-3 text-sm">
      <span className="text-muted-foreground">o copia la de otro período:</span>
      <select
        className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
        value={fromPeriodId}
        onChange={(e) => setFromPeriodId(e.target.value ? Number(e.target.value) : '')}
      >
        <option value="">Selecciona...</option>
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button size="sm" variant="outline" disabled={!fromPeriodId || copying} onClick={copy}>
        {copying ? 'Copiando...' : 'Copiar configuración'}
      </Button>
    </div>
  )
}

