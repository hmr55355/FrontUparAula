import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Hand, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { participationsApi } from '@/services/api/monitors'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { useActivePeriod } from '@/hooks/useActivePeriod'
import { localDateString, periodForDate } from '@/utils/dateHelpers'

/**
 * Participación en clase (vista docente). Lo que registra el docente cuenta de
 * inmediato; lo de los monitores entra cuando se aprueba. Para que salga en la
 * planilla, agrega una columna "Calculada desde participaciones".
 */
export function Participations() {
  const queryClient = useQueryClient()
  const { course, activeCourse } = useActiveCourseGroup()
  const groupSubjectId = course?.id
  const { data: periods, activePeriod } = useActivePeriod(course?.academic_year_id)
  const [periodId, setPeriodId] = useState<number | null>(null)
  const [busyStudent, setBusyStudent] = useState<number | null>(null)

  useEffect(() => {
    if (activePeriod && (periodId === null || !periods?.some((p) => p.id === periodId))) setPeriodId(activePeriod.id)
  }, [activePeriod, periods, periodId])

  const { data } = useQuery({
    queryKey: ['participations', groupSubjectId, periodId],
    queryFn: () => participationsApi.list(groupSubjectId as number, periodId as number),
    enabled: !!groupSubjectId && !!periodId,
  })

  const today = localDateString()
  const todayPeriod = periodForDate(periods, today)

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['participations', groupSubjectId] })
    queryClient.invalidateQueries({ queryKey: ['grades-sheet', groupSubjectId] })
  }

  const add = async (studentId: number) => {
    if (!groupSubjectId) return
    setBusyStudent(studentId)
    try {
      await participationsApi.create({ group_subject_id: groupSubjectId, student_id: studentId, date: today })
      refresh()
    } catch (error) {
      toast.error((axios.isAxiosError(error) && error.response?.data?.message) || 'No pudimos registrar la participación.')
    } finally {
      setBusyStudent(null)
    }
  }

  const remove = async (id: number) => {
    try {
      await participationsApi.remove(id)
      refresh()
    } catch {
      toast.error('No pudimos eliminarla.')
    }
  }

  if (!groupSubjectId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Selecciona un curso activo en el encabezado.
        </CardContent>
      </Card>
    )
  }

  const max = Math.max(0, ...Object.values(data?.totals ?? {}))
  const nameOf = (id: number) => {
    const s = data?.students.find((x) => x.id === id)
    return s ? `${s.last_name} ${s.first_name}` : ''
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">
            <Hand className="mb-1 inline h-5 w-5 text-primary" /> Participación
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeCourse?.groupName} — {activeCourse?.subjectName}
          </p>
        </div>
        <select
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
          value={periodId ?? ''}
          onChange={(e) => setPeriodId(Number(e.target.value))}
        >
          {periods?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted-foreground">
        La nota se calcula tomando como 10 al estudiante con más participaciones del período; los demás son proporcionales
        (mínimo 1.0). Agrégala a la planilla con una columna "Calculada desde participaciones".
        {todayPeriod && periodId !== todayPeriod.id && ` Lo que registres hoy cuenta para el ${todayPeriod.name}.`}
      </p>

      <div className="flex flex-col gap-2">
        {data?.students.map((student) => {
          const total = data.totals[student.id] ?? 0
          const preview = max > 0 ? Math.max(1, (total / max) * 10) : null
          return (
            <Card key={student.id}>
              <CardContent className="flex items-center gap-3 py-2">
                <span className="flex-1 font-medium">
                  {student.last_name} {student.first_name}
                </span>
                <span className="text-sm text-muted-foreground">{preview !== null ? `nota ≈ ${preview.toFixed(1)}` : ''}</span>
                <span className="w-8 text-center text-lg font-semibold">{total}</span>
                <Button
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => add(student.id)}
                  disabled={busyStudent === student.id}
                  aria-label={`Sumar participación a ${student.first_name}`}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!!data?.participations.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registros del período</CardTitle>
          </CardHeader>
          <CardContent className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {data.participations.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="w-24 text-muted-foreground">{p.date.slice(0, 10)}</span>
                <span className="flex-1">{nameOf(p.student_id)}</span>
                <span className="font-medium">+{p.points}</span>
                {p.monitor_submission_id && <span className="text-xs text-muted-foreground">monitor</span>}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(p.id)} aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
