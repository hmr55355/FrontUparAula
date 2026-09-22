import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { monitorsApi } from '@/services/api/monitors'
import { groupsApi } from '@/services/api/groups'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { submissionSummary } from '@/pages/monitor/MonitorSubmissions'
import { SUBMISSION_STATUS_LABELS, SUBMISSION_TYPE_LABELS, type SubmissionStatus } from '@/types/monitors'

/** Monitores de curso (vista docente): revisar lo que envían y habilitarlos. */
export function Monitors() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Monitores de curso</h1>
        <p className="text-sm text-muted-foreground">
          Tus monitores pueden tomar asistencia, registrar participaciones y comportamiento. Nada cuenta hasta que lo apruebes.
        </p>
      </div>
      <Tabs defaultValue="reviews">
        <TabsList>
          <TabsTrigger value="reviews">Por revisar</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="manage">Mis monitores</TabsTrigger>
        </TabsList>
        <TabsContent value="reviews">
          <SubmissionList status="pending" />
        </TabsContent>
        <TabsContent value="history">
          <div className="flex flex-col gap-4">
            <SubmissionList status="approved" />
            <SubmissionList status="rejected" />
          </div>
        </TabsContent>
        <TabsContent value="manage">
          <ManageMonitors />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SubmissionList({ status }: { status: SubmissionStatus }) {
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['monitor-submissions', status],
    queryFn: () => monitorsApi.submissions(status),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{status === 'pending' ? 'Pendientes de aprobación' : SUBMISSION_STATUS_LABELS[status] + 's'}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {submissions?.length === 0 && (
          <p className="text-sm text-muted-foreground">{status === 'pending' ? 'No hay nada por revisar. 🎉' : 'Sin registros.'}</p>
        )}
        {submissions?.map((s) => (
          <Link
            key={s.id}
            to={`/monitors/reviews/${s.id}`}
            className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <span className="font-medium">{SUBMISSION_TYPE_LABELS[s.type]}</span>
            <span className="text-muted-foreground">
              {s.group_subject?.group?.name} — {s.group_subject?.subject?.name} · {submissionSummary(s)}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {s.submitter?.name} · {(s.payload as { date: string }).date}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}

function ManageMonitors() {
  const queryClient = useQueryClient()
  const { course, activeCourse } = useActiveCourseGroup()
  const groupSubjectId = course?.id
  const [studentId, setStudentId] = useState<number | ''>('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const { data: monitors } = useQuery({
    queryKey: ['course-monitors', groupSubjectId],
    queryFn: () => monitorsApi.list(groupSubjectId as number),
    enabled: !!groupSubjectId,
  })
  const { data: students } = useQuery({
    queryKey: ['group-students', course?.group_id],
    queryFn: () => groupsApi.students(course!.group_id),
    enabled: !!course,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['course-monitors', groupSubjectId] })
  const errorMessage = (error: unknown) => {
    if (!axios.isAxiosError(error)) return 'No pudimos completar la acción.'
    const errors = error.response?.data?.errors as Record<string, string[]> | undefined
    return (errors && Object.values(errors)[0]?.[0]) || error.response?.data?.message || 'No pudimos completar la acción.'
  }

  const create = useMutation({
    mutationFn: () => monitorsApi.create(groupSubjectId as number, { student_id: studentId as number, username, password }),
    onSuccess: () => {
      toast.success(`Monitor creado. Comparte: usuario "${username.toLowerCase()}" y la contraseña que elegiste.`)
      setStudentId('')
      setUsername('')
      setPassword('')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const update = useMutation({
    mutationFn: (vars: { id: number; is_active?: boolean; password?: string }) => {
      const { id, ...payload } = vars
      return monitorsApi.update(id, payload)
    },
    onSuccess: () => {
      toast.success('Monitor actualizado.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  if (!groupSubjectId) {
    return <p className="text-sm text-muted-foreground">Selecciona un curso activo en el encabezado.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nuevo monitor</CardTitle>
          <CardDescription>
            Para {activeCourse?.groupName} — {activeCourse?.subjectName}. Solo podrá trabajar en este curso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Estudiante</Label>
            <SearchableSelect
              value={studentId}
              onChange={setStudentId}
              options={(students ?? []).map((s) => ({ id: s.id, label: `${s.last_name} ${s.first_name}` }))}
              placeholder="Elige al estudiante monitor"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="monitor-username">Usuario</Label>
              <Input
                id="monitor-username"
                value={username}
                autoCapitalize="none"
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                placeholder="ej. jperez1001"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="monitor-password">Contraseña</Label>
              <Input
                id="monitor-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          </div>
          <Button
            className="w-fit"
            onClick={() => create.mutate()}
            disabled={!studentId || username.length < 4 || password.length < 6 || create.isPending}
          >
            Crear monitor
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monitores de este curso</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {monitors?.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay monitores en este curso.</p>}
          {monitors?.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">{m.user?.name}</span>
              <span className="text-muted-foreground">usuario: {m.user?.username}</span>
              <Badge variant={m.is_active ? 'success' : 'secondary'}>{m.is_active ? 'Activo' : 'Desactivado'}</Badge>
              {!!m.pending_count && <Badge variant="warning">{m.pending_count} por revisar</Badge>}
              <div className="ml-auto flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = window.prompt(`Nueva contraseña para ${m.user?.username} (mínimo 6 caracteres):`)
                    if (next && next.length >= 6) update.mutate({ id: m.id, password: next })
                  }}
                >
                  Cambiar contraseña
                </Button>
                <Button variant="ghost" size="sm" onClick={() => update.mutate({ id: m.id, is_active: !m.is_active })}>
                  {m.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
