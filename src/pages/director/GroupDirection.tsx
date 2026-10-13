import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { groupsApi } from '@/services/api/groups'
import type { ConsolidatedResponse, PreEnrollmentRow, PreEnrollmentStatus } from '@/services/api/groups'
import { periodsApi } from '@/services/api/periods'
import { getGradeColor } from '@/utils/gradeHelpers'
import { downloadFromApi } from '@/utils/download'
import { cn } from '@/lib/utils'
import type { MyGroup } from '@/types'

/** Dispara una descarga mostrando el progreso y el error en un toast. */
function useDownload() {
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (key: string, url: string, params: Record<string, string | number | undefined>, name: string) => {
    setBusy(key)
    try {
      await downloadFromApi(url, params, name)
    } catch {
      toast.error('No pudimos generar el archivo.')
    } finally {
      setBusy(null)
    }
  }
  return { busy, run }
}

/**
 * Dirección de grupo: el director (o el administrador) ve su grupo completo —
 * todas las materias de cada estudiante—, descarga el consolidado y los boletines,
 * y hace la prematrícula del año siguiente.
 */
export function GroupDirection() {
  const { data: allGroups, isLoading } = useQuery({ queryKey: ['groups', 'mine'], queryFn: groupsApi.mine })
  const groups = useMemo(() => (allGroups ?? []).filter((g) => g.can_oversee), [allGroups])
  const [groupId, setGroupId] = useState<number | null>(null)
  const [periodId, setPeriodId] = useState<number | null>(null)

  useEffect(() => {
    if (groups.length && !groups.some((g) => g.id === groupId)) {
      setGroupId((groups.find((g) => g.is_director) ?? groups[0]).id)
    }
  }, [groups, groupId])
  const group = groups.find((g) => g.id === groupId)

  const { data: periods } = useQuery({
    queryKey: ['periods', group?.academic_year_id],
    queryFn: () => periodsApi.list(group!.academic_year_id),
    enabled: !!group,
  })
  useEffect(() => {
    if (periods?.length && !periods.some((p) => p.id === periodId)) {
      setPeriodId((periods.find((p) => p.is_active) ?? periods[0]).id)
    }
  }, [periods, periodId])

  if (isLoading) return <p className="text-sm text-muted-foreground">Cargando...</p>

  if (groups.length === 0) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No eres director(a) de ningún grupo este año. El administrador asigna la dirección de grupo en Institución →
          Grupos.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Dirección de grupo</h1>
          <p className="text-sm text-muted-foreground">
            {group ? `Grupo ${group.name} · Director(a): ${group.director?.name ?? 'sin asignar'}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {groups.length > 1 && (
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={groupId ?? ''}
              onChange={(e) => setGroupId(Number(e.target.value))}
              aria-label="Grupo"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.is_director ? ' ★' : ''}
                </option>
              ))}
            </select>
          )}
          <select
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            value={periodId ?? ''}
            onChange={(e) => setPeriodId(Number(e.target.value))}
            aria-label="Período"
          >
            {periods?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {group && periodId && (
        <Tabs defaultValue="consolidated">
          <TabsList className="h-auto flex-wrap gap-1">
            <TabsTrigger value="consolidated">Consolidado</TabsTrigger>
            <TabsTrigger value="bulletins">Boletines</TabsTrigger>
            <TabsTrigger value="pre-enrollment">Prematrícula</TabsTrigger>
          </TabsList>
          <TabsContent value="consolidated">
            <Consolidated key={`${group.id}-${periodId}`} group={group} periodId={periodId} />
          </TabsContent>
          <TabsContent value="bulletins">
            <Bulletins key={`${group.id}-${periodId}`} group={group} periodId={periodId} />
          </TabsContent>
          <TabsContent value="pre-enrollment">
            <PreEnrollment key={group.id} group={group} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function useConsolidated(groupId: number, periodId: number) {
  return useQuery({
    queryKey: ['group-consolidated', groupId, periodId],
    queryFn: () => groupsApi.consolidated(groupId, periodId),
  })
}

function studentName(data: ConsolidatedResponse, studentId: number) {
  const s = data.students.find((x) => x.id === studentId)
  return s ? `${s.last_name} ${s.first_name}` : ''
}

/** Todas las materias de cada estudiante, con promedio, puesto, materias en Bajo y faltas. */
function Consolidated({ group, periodId }: { group: MyGroup; periodId: number }) {
  const { data, isLoading } = useConsolidated(group.id, periodId)
  const { busy, run } = useDownload()

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Cargando consolidado...</p>

  const exportAs = (format: 'excel' | 'pdf') =>
    run(format, `/groups/${group.id}/consolidated/export`, { periodId, format }, `consolidado-${group.name}`)
  const atRisk = data.rows.filter((r) => r.failed > 0).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {data.rows.length} estudiantes · {atRisk} con al menos una materia en desempeño bajo
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => exportAs('excel')} disabled={!!busy}>
            <FileSpreadsheet className="h-4 w-4" /> {busy === 'excel' ? 'Generando...' : 'Excel'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportAs('pdf')} disabled={!!busy}>
            <FileText className="h-4 w-4" /> {busy === 'pdf' ? 'Generando...' : 'PDF'}
          </Button>
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-lg border">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[200px] border-b border-r bg-card px-3 py-2 text-left">
                Estudiante
              </th>
              {data.subjects.map((s) => (
                <th
                  key={s.group_subject_id}
                  className="sticky top-0 z-20 min-w-[90px] border-b border-l px-2 py-2 text-center text-white"
                  style={{ backgroundColor: s.color }}
                  title={s.teacher ? `Docente: ${s.teacher}` : undefined}
                >
                  {s.name}
                </th>
              ))}
              {['Promedio', 'Puesto', 'En bajo', 'Faltas'].map((h) => (
                <th key={h} className="sticky top-0 z-20 border-b border-l bg-muted px-2 py-2 text-center font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.student_id} className="hover:bg-muted/30">
                <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2 font-medium">
                  <Link to={`/student/${row.student_id}`} className="hover:underline">
                    {studentName(data, row.student_id)}
                  </Link>
                </td>
                {data.subjects.map((s) => {
                  const grade = row.grades[s.group_subject_id]
                  const { background, text } = getGradeColor(grade, data.min_passing_grade)
                  return (
                    <td
                      key={s.group_subject_id}
                      className="border-b border-l px-2 py-2 text-center"
                      style={{ backgroundColor: background, color: text }}
                    >
                      {grade !== null ? grade.toFixed(1) : '—'}
                    </td>
                  )
                })}
                <td className="border-b border-l px-2 py-2 text-center font-semibold">
                  {row.average !== null ? row.average.toFixed(2) : '—'}
                </td>
                <td className="border-b border-l px-2 py-2 text-center">{row.rank ?? '—'}</td>
                <td className={cn('border-b border-l px-2 py-2 text-center', row.failed > 0 && 'font-semibold text-danger')}>
                  {row.failed}
                </td>
                <td className="border-b border-l px-2 py-2 text-center">{row.absences}</td>
              </tr>
            ))}
            <tr className="bg-muted/50 font-medium">
              <td className="sticky left-0 z-10 border-r bg-muted px-3 py-2">Promedio del grupo</td>
              {data.subjects.map((s) => (
                <td key={s.group_subject_id} className="border-l px-2 py-2 text-center">
                  {s.average !== null ? s.average.toFixed(2) : '—'}
                  {s.failed > 0 && <span className="block text-xs font-normal text-danger">{s.failed} en bajo</span>}
                </td>
              ))}
              <td className="border-l" colSpan={4} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Boletines: todos en un PDF (uno por página) o el de un estudiante. */
function Bulletins({ group, periodId }: { group: MyGroup; periodId: number }) {
  const { data } = useConsolidated(group.id, periodId)
  const { busy, run } = useDownload()
  const download = (studentId?: number) =>
    run(String(studentId ?? 'all'), `/groups/${group.id}/bulletins`, { periodId, studentId }, `boletines-${group.name}`)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
        <p className="text-sm text-muted-foreground">
          Cada boletín trae todas las materias del estudiante con su desempeño y equivalencia en la escala nacional,
          promedio, puesto, asistencia y observaciones.
        </p>
        <Button onClick={() => download()} disabled={!!busy}>
          <Download className="h-4 w-4" /> {busy === 'all' ? 'Generando...' : `Boletines de todo ${group.name} (PDF)`}
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        {data?.rows.map((row) => (
          <div key={row.student_id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
            <span>
              {studentName(data, row.student_id)}
              <span className="ml-2 text-xs text-muted-foreground">
                {row.average !== null ? `Promedio ${row.average.toFixed(2)}` : 'Sin notas'}
                {row.rank ? ` · Puesto ${row.rank}` : ''}
              </span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => download(row.student_id)} disabled={!!busy}>
              <Download className="h-4 w-4" /> {busy === String(row.student_id) ? 'Generando...' : 'Boletín'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

const STATUS_LABELS: Record<PreEnrollmentStatus, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  no_continua: 'No continúa',
}

/** Prematrícula del año siguiente: quién continúa (y a qué grado) y quién no. */
function PreEnrollment({ group }: { group: MyGroup }) {
  const queryClient = useQueryClient()
  const [targetYear, setTargetYear] = useState<number | undefined>(undefined)
  const { data } = useQuery({
    queryKey: ['pre-enrollments', group.id, targetYear ?? 'default'],
    queryFn: () => groupsApi.preEnrollments(group.id, targetYear),
  })
  const [rows, setRows] = useState<PreEnrollmentRow[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const { busy, run } = useDownload()

  useEffect(() => {
    if (data) {
      setRows(data.rows)
      setDirty(false)
    }
  }, [data])

  const update = (studentId: number, changes: Partial<PreEnrollmentRow>) => {
    setRows((prev) => prev.map((r) => (r.student.id === studentId ? { ...r, ...changes } : r)))
    setDirty(true)
  }
  const setAll = (status: PreEnrollmentStatus) => {
    setRows((prev) => prev.map((r) => ({ ...r, status })))
    setDirty(true)
  }

  const save = async () => {
    if (!data) return
    setSaving(true)
    try {
      const saved = await groupsApi.savePreEnrollments(group.id, {
        target_year: data.target_year,
        items: rows.map((r) => ({
          student_id: r.student.id,
          status: r.status,
          target_grade_level_id: r.target_grade_level_id,
          notes: r.notes?.trim() || null,
        })),
      })
      queryClient.setQueryData(['pre-enrollments', group.id, targetYear ?? 'default'], saved)
      toast.success('Prematrícula guardada.')
    } catch (error) {
      toast.error((axios.isAxiosError(error) && error.response?.data?.message) || 'No pudimos guardar la prematrícula.')
    } finally {
      setSaving(false)
    }
  }

  if (!data) return <p className="text-sm text-muted-foreground">Cargando...</p>

  const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {})

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted-foreground">Año al que se prematricula</span>
            <Input
              type="number"
              className="h-9 w-28"
              value={data.target_year}
              onChange={(e) => e.target.value.length === 4 && setTargetYear(Number(e.target.value))}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            {(Object.keys(STATUS_LABELS) as PreEnrollmentStatus[])
              .map((s) => `${STATUS_LABELS[s]}: ${counts[s] ?? 0}`)
              .join(' · ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setAll('confirmada')}>
            Marcar todos como confirmados
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!!busy || dirty}
            title={dirty ? 'Guarda los cambios antes de descargar' : undefined}
            onClick={() =>
              run('pre', `/groups/${group.id}/pre-enrollments/export`, { targetYear: data.target_year }, `prematricula-${group.name}`)
            }
          >
            <FileSpreadsheet className="h-4 w-4" /> {busy === 'pre' ? 'Generando...' : 'Descargar lista'}
          </Button>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Guardando...' : 'Guardar prematrícula'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {rows.map((row) => (
          <div
            key={row.student.id}
            className="grid grid-cols-1 items-center gap-2 rounded-md border px-3 py-2 text-sm sm:grid-cols-[1fr_150px_150px_1fr]"
          >
            <span className="font-medium">
              {row.student.last_name} {row.student.first_name}
              {!row.saved && <span className="ml-2 text-xs font-normal text-muted-foreground">sin registrar</span>}
            </span>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2"
              value={row.status}
              onChange={(e) => update(row.student.id, { status: e.target.value as PreEnrollmentStatus })}
              aria-label={`Estado de ${row.student.first_name}`}
            >
              {(Object.keys(STATUS_LABELS) as PreEnrollmentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2 disabled:opacity-50"
              value={row.target_grade_level_id ?? ''}
              disabled={row.status === 'no_continua'}
              onChange={(e) => update(row.student.id, { target_grade_level_id: e.target.value ? Number(e.target.value) : null })}
              aria-label="Grado de destino"
            >
              <option value="">Grado por definir</option>
              {data.grade_levels.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <Input
              className="h-9"
              placeholder="Observación (opcional)"
              value={row.notes ?? ''}
              onChange={(e) => update(row.student.id, { notes: e.target.value })}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        La prematrícula no matricula a nadie: es la lista con la que la institución arma los grupos del año nuevo. Quien
        repite el grado se deja con su grado actual.
      </p>
    </div>
  )
}
