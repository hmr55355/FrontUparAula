import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Check, Pencil, X } from 'lucide-react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select'
import { api } from '@/services/api/client'
import { institutionsApi } from '@/services/api/institutions'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { academicStructureApi } from '@/services/api/academicStructure'
import { GradeLevelsPanel, gradeLevelsQueryKey } from '@/pages/institution/GradeLevelsPanel'
import { ShiftsPanel, shiftsQueryKey } from '@/pages/institution/ShiftsPanel'
import type { GradeLevel } from '@/types'

export function InstitutionSettings() {
  const { data: institution } = useCurrentInstitution()

  if (!institution) {
    return <p className="text-sm text-muted-foreground">Cargando institución...</p>
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">{institution.name}</h1>
        <p className="text-sm text-muted-foreground">
          {institution.city}, {institution.department}
        </p>
      </div>

      <LogoCard institutionId={institution.id} hasLogo={!!institution.logo} />

      <Tabs defaultValue="teachers">
        {/* h-auto + flex-wrap: con 6 pestañas la segunda fila no debe montarse sobre el contenido */}
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="teachers">Docentes</TabsTrigger>
          <TabsTrigger value="grade-levels">Grados</TabsTrigger>
          <TabsTrigger value="shifts">Jornadas</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="subjects">Materias</TabsTrigger>
          <TabsTrigger value="assignments">Asignaciones</TabsTrigger>
        </TabsList>
        <TabsContent value="teachers">
          <TeachersPanel institutionId={institution.id} />
        </TabsContent>
        <TabsContent value="grade-levels">
          <GradeLevelsPanel institutionId={institution.id} />
        </TabsContent>
        <TabsContent value="shifts">
          <ShiftsPanel institutionId={institution.id} />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsPanel institutionId={institution.id} />
        </TabsContent>
        <TabsContent value="subjects">
          <SubjectsPanel institutionId={institution.id} />
        </TabsContent>
        <TabsContent value="assignments">
          <AssignmentsPanel institutionId={institution.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LogoCard({ institutionId, hasLogo }: { institutionId: number; hasLogo: boolean }) {
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)

  const { data: logoUrl } = useQuery({
    queryKey: ['institutions', institutionId, 'logo'],
    queryFn: () => institutionsApi.logoBlobUrl(institutionId),
    enabled: hasLogo,
  })

  const upload = useMutation({
    mutationFn: () => institutionsApi.updateLogo(institutionId, file as File),
    onSuccess: () => {
      toast.success('Logo actualizado.')
      setFile(null)
      queryClient.invalidateQueries({ queryKey: ['institutions', 'current'] })
      queryClient.invalidateQueries({ queryKey: ['institutions', institutionId, 'logo'] })
    },
    onError: () => toast.error('No pudimos actualizar el logo.'),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo de la institución</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {logoUrl && <img src={logoUrl} alt="Logo actual" className="h-16 w-auto rounded border object-contain" />}
        <div className="flex flex-wrap items-center gap-2">
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button size="sm" variant="outline" disabled={!file || upload.isPending} onClick={() => upload.mutate()}>
            {upload.isPending ? 'Guardando...' : 'Guardar logo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

interface Teacher {
  id: number
  user_id: number
  name: string
  email: string
  role: 'admin' | 'teacher'
  status: string
}

function TeachersPanel({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [coursesTeacher, setCoursesTeacher] = useState<Teacher | null>(null)

  const { data } = useQuery({
    queryKey: ['institutions', institutionId, 'teachers', page],
    queryFn: () =>
      api
        .get<{ data: Teacher[]; meta: { current_page: number; last_page: number } }>(
          `/institutions/${institutionId}/teachers`,
          { params: { page } }
        )
        .then((r) => r.data),
    // Docentes/grupos/materias cambian poco — evita re-pedir en cada montaje.
    staleTime: 3 * 60 * 1000,
  })
  const teachers = data?.data
  const meta = data?.meta

  const invite = useMutation({
    mutationFn: () => api.post(`/institutions/${institutionId}/teachers/invite`, { email: inviteEmail }),
    onSuccess: () => {
      toast.success('Invitación enviada.')
      setInviteEmail('')
      queryClient.invalidateQueries({ queryKey: ['institutions', institutionId, 'teachers'] })
    },
    onError: () => toast.error('No pudimos invitar a ese docente. ¿Ya tiene cuenta en UparAula?'),
  })

  const remove = useMutation({
    mutationFn: (userId: number) => api.delete(`/institutions/${institutionId}/teachers/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions', institutionId, 'teachers'] }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Docentes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Correo del docente a invitar"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={() => invite.mutate()} disabled={!inviteEmail || invite.isPending}>
            Invitar docente
          </Button>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            Crear docente
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teachers?.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.name}</TableCell>
                <TableCell>{t.email}</TableCell>
                <TableCell>
                  <Badge variant={t.role === 'admin' ? 'default' : 'secondary'}>{t.role}</Badge>
                </TableCell>
                <TableCell>{t.status}</TableCell>
                <TableCell className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setCoursesTeacher(t)}>
                    Cursos
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(t.user_id)}>
                    Remover
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {meta.current_page} de {meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </CardContent>

      <CreateTeacherDialog open={createOpen} onOpenChange={setCreateOpen} institutionId={institutionId} />
      {coursesTeacher && (
        <TeacherCoursesDialog
          open
          onOpenChange={(open) => !open && setCoursesTeacher(null)}
          institutionId={institutionId}
          teacherUserId={coursesTeacher.user_id}
          teacherName={coursesTeacher.name}
        />
      )}
    </Card>
  )
}

function CreateTeacherDialog({
  open,
  onOpenChange,
  institutionId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  institutionId: number
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'teacher'>('teacher')

  const reset = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('teacher')
  }

  const create = useMutation({
    mutationFn: () => api.post(`/institutions/${institutionId}/teachers`, { name, email, password, role }),
    onSuccess: () => {
      toast.success(`Docente creado. Comparte estas credenciales: ${email} / ${password}`)
      queryClient.invalidateQueries({ queryKey: ['institutions', institutionId, 'teachers'] })
      reset()
      onOpenChange(false)
    },
    onError: (error) => {
      const message =
        (axios.isAxiosError(error) && (error.response?.data?.errors?.email?.[0] || error.response?.data?.message)) ||
        'No pudimos crear el docente.'
      toast.error(message)
    },
  })

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) reset(); onOpenChange(next) }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear docente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Correo</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Contraseña</Label>
            <Input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div className="space-y-1">
            <Label>Rol</Label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-3"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'teacher')}
            >
              <option value="teacher">Docente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => create.mutate()} disabled={!name || !email || password.length < 8 || create.isPending}>
            {create.isPending ? 'Creando...' : 'Crear docente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TeacherCoursesDialog({
  open,
  onOpenChange,
  institutionId,
  teacherUserId,
  teacherName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  institutionId: number
  teacherUserId: number
  teacherName: string
}) {
  const queryClient = useQueryClient()
  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [groupId, setGroupId] = useState<number | ''>('')

  const { data: grid } = useQuery({
    queryKey: ['institutions', institutionId, 'assignment-grid'],
    queryFn: () =>
      api.get<AssignmentGridResponse>(`/institutions/${institutionId}/assignment-grid`).then((r) => r.data),
    staleTime: 3 * 60 * 1000,
    enabled: open,
  })

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', institutionId],
    queryFn: () =>
      api.get<{ data: { id: number; is_active: boolean }[] }>('/academic-years', { params: { institutionId } }).then(
        (r) => r.data.data
      ),
    staleTime: 3 * 60 * 1000,
    enabled: open,
  })
  const activeYear = academicYears?.find((y) => y.is_active)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['institutions', institutionId, 'assignment-grid'] })

  const assign = useMutation({
    mutationFn: (vars: { groupId: number; subjectId: number }) =>
      api.post(`/institutions/${institutionId}/assign-course`, {
        group_id: vars.groupId,
        subject_id: vars.subjectId,
        user_id: teacherUserId,
        academic_year_id: activeYear?.id,
      }),
    onSuccess: () => {
      toast.success('Curso asignado.')
      setSubjectId('')
      setGroupId('')
      invalidate()
    },
    onError: () => toast.error('No pudimos asignar el curso.'),
  })

  const unassign = useMutation({
    mutationFn: (vars: { groupId: number; subjectId: number }) =>
      api.delete(`/institutions/${institutionId}/unassign-course`, {
        data: { group_id: vars.groupId, subject_id: vars.subjectId, academic_year_id: activeYear?.id },
      }),
    onSuccess: () => {
      toast.success('Asignación removida.')
      invalidate()
    },
    onError: () => toast.error('No pudimos quitar la asignación.'),
  })

  const myAssignments = grid?.assignments.filter((a) => a.user_id === teacherUserId) ?? []
  const takenPairs = new Set((grid?.assignments ?? []).map((a) => `${a.group_id}:${a.subject_id}`))
  const availablePairs = new Set((grid?.available_pairs ?? []).map((p) => pairKey(p.group_id, p.subject_id)))
  // Solo grupos cuyo grado lleva esta materia y que aún no tienen docente en ella.
  const groupsForSubject =
    grid && subjectId
      ? grid.groups.filter(
          (g) => availablePairs.has(pairKey(g.id, subjectId)) && !takenPairs.has(pairKey(g.id, subjectId))
        )
      : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cursos de {teacherName}</DialogTitle>
        </DialogHeader>

        {!grid ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <div className="flex flex-col gap-3">
            {myAssignments.length === 0 && (
              <p className="text-sm text-muted-foreground">Sin cursos asignados todavía.</p>
            )}
            {myAssignments.map((a) => {
              const group = grid.groups.find((g) => g.id === a.group_id)
              const subject = grid.subjects.find((s) => s.id === a.subject_id)
              return (
                <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span>
                    {group ? groupLabel(grid, group) : ''} —{' '}
                    <span style={{ color: subject?.color }}>{subject?.name}</span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={unassign.isPending}
                    onClick={() => unassign.mutate({ groupId: a.group_id, subjectId: a.subject_id })}
                  >
                    Quitar
                  </Button>
                </div>
              )
            })}

            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Agregar curso</p>
              {!activeYear && (
                <p className="mb-2 text-sm text-warning">No hay un año académico activo.</p>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Materia</Label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={subjectId}
                    onChange={(e) => {
                      setSubjectId(e.target.value ? Number(e.target.value) : '')
                      setGroupId('')
                    }}
                  >
                    <option value="">Selecciona...</option>
                    {grid.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grupo</Label>
                  <select
                    className="h-10 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={groupId}
                    disabled={!subjectId}
                    onChange={(e) => setGroupId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Selecciona...</option>
                    {groupsForSubject.map((g) => (
                      <option key={g.id} value={g.id}>
                        {groupLabel(grid, g)}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  size="sm"
                  disabled={!subjectId || !groupId || !activeYear || assign.isPending}
                  onClick={() => subjectId && groupId && assign.mutate({ groupId, subjectId })}
                >
                  Agregar
                </Button>
              </div>
              {!!subjectId && groupsForSubject.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No hay grupos disponibles: todos ya tienen docente en esta materia, o la materia no está vinculada a
                  su grado.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function GroupsPanel({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [gradeLevelId, setGradeLevelId] = useState<number | ''>('')
  const [shiftId, setShiftId] = useState<number | ''>('')
  const [shiftFilter, setShiftFilter] = useState<number | ''>('')

  const { data: groups } = useQuery({
    queryKey: ['groups', institutionId],
    queryFn: () => institutionsApi.groups(institutionId),
    staleTime: 3 * 60 * 1000,
  })

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', institutionId],
    queryFn: () =>
      api.get<{ data: { id: number; is_active: boolean }[] }>('/academic-years', { params: { institutionId } }).then(
        (r) => r.data.data
      ),
    staleTime: 3 * 60 * 1000,
  })
  const activeYear = academicYears?.find((y) => y.is_active)

  const { data: gradeLevels } = useQuery({
    queryKey: gradeLevelsQueryKey(institutionId),
    queryFn: () => academicStructureApi.gradeLevels(institutionId),
    staleTime: 3 * 60 * 1000,
  })
  const { data: shifts } = useQuery({
    queryKey: shiftsQueryKey(institutionId),
    queryFn: () => academicStructureApi.shifts(institutionId),
    staleTime: 3 * 60 * 1000,
  })
  const effectiveShiftId = shiftId || shifts?.[0]?.id

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['groups', institutionId] })
    queryClient.invalidateQueries({ queryKey: gradeLevelsQueryKey(institutionId) })
    queryClient.invalidateQueries({ queryKey: shiftsQueryKey(institutionId) })
    queryClient.invalidateQueries({ queryKey: ['institutions', institutionId, 'assignment-grid'] })
    // El nombre del grupo sale en el selector de cursos y en "Mis cursos".
    queryClient.invalidateQueries({ queryKey: ['group-subjects'] })
  }

  const createGroup = useMutation({
    mutationFn: () =>
      api.post('/groups', {
        institution_id: institutionId,
        academic_year_id: activeYear?.id,
        name,
        grade_level_id: gradeLevelId,
        shift_id: effectiveShiftId,
      }),
    onSuccess: () => {
      toast.success('Grupo creado.')
      setName('')
      invalidate()
    },
    onError: () => toast.error('No pudimos crear el grupo.'),
  })

  const updateGroup = useMutation({
    mutationFn: (vars: { id: number; name?: string; grade_level_id?: number; shift_id?: number }) => {
      const { id, ...payload } = vars
      return api.put(`/groups/${id}`, payload)
    },
    onSuccess: () => {
      toast.success('Grupo actualizado.')
      invalidate()
    },
    onError: () => toast.error('No pudimos actualizar el grupo.'),
  })

  const visibleGroups = groups?.filter((g) => !shiftFilter || g.shift_id === shiftFilter)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grupos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {gradeLevels?.length === 0 && (
          <p className="rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            Primero crea los grados de tu institución en la pestaña "Grados".
          </p>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="group-name">Nombre</Label>
            <Input
              id="group-name"
              placeholder="1001"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-32"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="group-grade">Grado</Label>
            <select
              id="group-grade"
              className="h-10 rounded-md border border-input bg-transparent px-2 text-sm"
              value={gradeLevelId}
              onChange={(e) => setGradeLevelId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Selecciona...</option>
              {gradeLevels?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="group-shift">Jornada</Label>
            <select
              id="group-shift"
              className="h-10 rounded-md border border-input bg-transparent px-2 text-sm"
              value={effectiveShiftId ?? ''}
              onChange={(e) => setShiftId(Number(e.target.value))}
            >
              {shifts?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={() => createGroup.mutate()}
            disabled={!name || !gradeLevelId || !activeYear || createGroup.isPending}
          >
            Agregar grupo
          </Button>
        </div>

        {shifts && shifts.length > 1 && (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Ver jornada:</Label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Todas</option>
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Grado</TableHead>
              <TableHead>Jornada</TableHead>
              <TableHead>Estudiantes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleGroups?.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">
                  <InlineNameEdit
                    value={g.name}
                    disabled={updateGroup.isPending}
                    onSave={(name) => updateGroup.mutate({ id: g.id, name })}
                  />
                </TableCell>
                <TableCell>
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={g.grade_level_id ?? ''}
                    onChange={(e) => updateGroup.mutate({ id: g.id, grade_level_id: Number(e.target.value) })}
                  >
                    {!g.grade_level_id && <option value="">Sin grado ({g.grade_level})</option>}
                    {gradeLevels?.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={g.shift_id ?? ''}
                    onChange={(e) => updateGroup.mutate({ id: g.id, shift_id: Number(e.target.value) })}
                  >
                    {!g.shift_id && <option value="">Sin jornada</option>}
                    {shifts?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>{g.student_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function SubjectsPanel({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [newColor, setNewColor] = useState(SUBJECT_COLORS[0])
  const [newGradeIds, setNewGradeIds] = useState<number[]>([])
  const [editing, setEditing] = useState<{ id: number; name: string; color: string; gradeIds: number[] } | null>(null)

  const { data: subjects } = useQuery({
    queryKey: ['subjects', institutionId],
    queryFn: () => institutionsApi.subjects(institutionId),
    staleTime: 3 * 60 * 1000,
  })
  const { data: gradeLevels } = useQuery({
    queryKey: gradeLevelsQueryKey(institutionId),
    queryFn: () => academicStructureApi.gradeLevels(institutionId),
    staleTime: 3 * 60 * 1000,
  })
  const gradeName = (id: number) => gradeLevels?.find((g) => g.id === id)?.name

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['subjects', institutionId] })
    queryClient.invalidateQueries({ queryKey: gradeLevelsQueryKey(institutionId) })
    queryClient.invalidateQueries({ queryKey: ['institutions', institutionId, 'assignment-grid'] })
    queryClient.invalidateQueries({ queryKey: ['group-subjects'] })
  }

  const createSubject = useMutation({
    mutationFn: () =>
      api.post('/subjects', { institution_id: institutionId, name, color: newColor, grade_level_ids: newGradeIds }),
    onSuccess: () => {
      toast.success('Materia creada.')
      setName('')
      setNewColor(SUBJECT_COLORS[0])
      setNewGradeIds([])
      invalidate()
    },
    onError: () => toast.error('No pudimos crear la materia.'),
  })

  const saveSubject = useMutation({
    // El color solo se manda si cambió: una materia antigua con un color en otro
    // formato no debe fallar la validación (#RRGGBB) al editar su nombre o grados.
    mutationFn: (vars: { id: number; name: string; color: string; gradeIds: number[] }) =>
      api.put(`/subjects/${vars.id}`, {
        name: vars.name.trim(),
        grade_level_ids: vars.gradeIds,
        ...(vars.color !== subjects?.find((x) => x.id === vars.id)?.color && { color: vars.color }),
      }),
    onSuccess: () => {
      toast.success('Materia actualizada.')
      setEditing(null)
      invalidate()
    },
    onError: () => toast.error('No pudimos actualizar la materia.'),
  })

  const toggle = (ids: number[], id: number) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Materias</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 rounded-md border p-3">
          <div className="flex gap-2">
            <Input placeholder="Nombre de la materia" value={name} onChange={(e) => setName(e.target.value)} />
            <Button onClick={() => createSubject.mutate()} disabled={!name || createSubject.isPending}>
              Agregar materia
            </Button>
          </div>
          <SubjectColorPicker value={newColor} onChange={setNewColor} />
          {!!gradeLevels?.length && (
            <GradeCheckboxes
              gradeLevels={gradeLevels}
              selected={newGradeIds}
              onToggle={(id) => setNewGradeIds((prev) => toggle(prev, id))}
            />
          )}
        </div>

        <div className="flex flex-col gap-2">
          {subjects?.map((s) => {
            const isEditing = editing?.id === s.id
            const gradeIds = s.grade_level_ids ?? []
            return (
              <div key={s.id} className="flex flex-col gap-2 rounded-md border px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="font-medium">{s.name}</span>
                  {gradeIds.length === 0 ? (
                    <span className="text-xs text-warning">Sin grados: no se puede asignar a ningún grupo</span>
                  ) : (
                    gradeIds.map((id) => (
                      <Badge key={id} variant="secondary">
                        {gradeName(id)}
                      </Badge>
                    ))
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() =>
                      setEditing(isEditing ? null : { id: s.id, name: s.name, color: s.color, gradeIds })
                    }
                  >
                    {isEditing ? 'Cancelar' : 'Editar'}
                  </Button>
                </div>
                {isEditing && editing && (
                  <div className="flex flex-col gap-2 border-t pt-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre</Label>
                      <Input
                        className="h-9 max-w-sm"
                        value={editing.name}
                        onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                      />
                    </div>
                    <SubjectColorPicker value={editing.color} onChange={(color) => setEditing({ ...editing, color })} />
                    {gradeLevels && (
                      <GradeCheckboxes
                        gradeLevels={gradeLevels}
                        selected={editing.gradeIds}
                        onToggle={(id) => setEditing({ ...editing, gradeIds: toggle(editing.gradeIds, id) })}
                      />
                    )}
                    {gradeIds.some((id) => !editing.gradeIds.includes(id)) && (
                      <p className="text-xs text-muted-foreground">
                        Quitar un grado no borra los cursos que ya están asignados en sus grupos; solo impide asignar nuevos.
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="w-fit"
                      onClick={() => saveSubject.mutate(editing)}
                      disabled={!editing.name.trim() || saveSubject.isPending}
                    >
                      Guardar cambios
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Colores sugeridos para materias: oscuros, porque la materia se muestra con texto
 * blanco encima (encabezados de la planilla, asignaciones, insignias).
 */
const SUBJECT_COLORS = [
  '#1565C0', '#283593', '#6A1B9A', '#AD1457', '#C62828', '#EF6C00',
  '#2E7D32', '#558B2F', '#00695C', '#00838F', '#4E342E', '#37474F',
]

function SubjectColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const isCustom = !SUBJECT_COLORS.some((c) => c.toLowerCase() === value.toLowerCase())
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-sm text-muted-foreground">Color:</span>
      {SUBJECT_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={`h-7 w-7 rounded-full border-2 ${color.toLowerCase() === value.toLowerCase() ? 'border-foreground' : 'border-transparent'}`}
          style={{ backgroundColor: color }}
          aria-label={`Color ${color}`}
        />
      ))}
      <label
        className={`relative flex h-7 cursor-pointer items-center gap-1 rounded-full border-2 px-2 text-xs ${isCustom ? 'border-foreground' : 'border-input'}`}
        title="Otro color"
      >
        <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: value }} />
        Otro
        <input
          type="color"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
      </label>
      <span
        className="ml-2 rounded px-2 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: value }}
      >
        Vista previa
      </span>
    </div>
  )
}

/** Nombre con lápiz para editarlo en el sitio (Enter guarda, Escape cancela). */
function InlineNameEdit({
  value,
  onSave,
  disabled,
}: {
  value: string
  onSave: (value: string) => void
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-1">
        {value}
        <button
          type="button"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => {
            setDraft(value)
            setEditing(true)
          }}
          aria-label="Cambiar nombre"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </span>
    )
  }

  const save = () => {
    const name = draft.trim()
    setEditing(false)
    if (name && name !== value) onSave(name)
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        autoFocus
        className="h-8 w-28"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={disabled || !draft.trim()} onClick={save} aria-label="Guardar nombre">
        <Check className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)} aria-label="Cancelar">
        <X className="h-4 w-4" />
      </Button>
    </span>
  )
}

function GradeCheckboxes({
  gradeLevels,
  selected,
  onToggle,
}: {
  gradeLevels: GradeLevel[]
  selected: number[]
  onToggle: (id: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      <span className="text-sm text-muted-foreground">Se dicta en:</span>
      {gradeLevels.map((g) => (
        <label key={g.id} className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={selected.includes(g.id)} onChange={() => onToggle(g.id)} />
          {g.name}
        </label>
      ))}
    </div>
  )
}

interface AssignmentGridGroup {
  id: number
  name: string
  grade_level: string
  section: string | null
  grade_level_id: number | null
  shift_id: number | null
}

interface AssignmentGridSubject {
  id: number
  name: string
  color: string
  grade_level_ids: number[]
}

interface AssignmentGridAssignment {
  id: number
  group_id: number
  subject_id: number
  user_id: number
  teacher?: { id: number; name: string }
}

interface AssignmentGridResponse {
  groups: AssignmentGridGroup[]
  subjects: AssignmentGridSubject[]
  assignments: AssignmentGridAssignment[]
  /** Combinaciones grupo + materia válidas (la materia está vinculada al grado del grupo). */
  available_pairs: { group_id: number; subject_id: number }[]
  grade_levels: { id: number; name: string; level: number | null }[]
  shifts: { id: number; name: string }[]
}

function pairKey(groupId: number, subjectId: number) {
  return `${groupId}:${subjectId}`
}

function groupLabel(grid: AssignmentGridResponse, group: AssignmentGridGroup) {
  const grade = grid.grade_levels.find((g) => g.id === group.grade_level_id)?.name ?? group.grade_level
  return `${group.name} (${grade})`
}

function AssignmentsPanel({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient()
  const [shiftFilter, setShiftFilter] = useState<number | ''>('')

  const { data: grid } = useQuery({
    queryKey: ['institutions', institutionId, 'assignment-grid'],
    queryFn: () =>
      api.get<AssignmentGridResponse>(`/institutions/${institutionId}/assignment-grid`).then((r) => r.data),
    staleTime: 3 * 60 * 1000,
  })

  const { data: teachers } = useQuery({
    queryKey: ['institutions', institutionId, 'teachers', 'assignment-picker'],
    queryFn: () =>
      api
        .get<{ data: Teacher[] }>(`/institutions/${institutionId}/teachers`, { params: { page: 1 } })
        .then((r) => r.data.data),
    staleTime: 3 * 60 * 1000,
  })
  const teacherOptions: SearchableSelectOption[] = (teachers ?? [])
    .filter((t) => t.status === 'active')
    .map((t) => ({ id: t.user_id, label: t.name }))

  const { data: academicYears } = useQuery({
    queryKey: ['academic-years', institutionId],
    queryFn: () =>
      api.get<{ data: { id: number; is_active: boolean }[] }>('/academic-years', { params: { institutionId } }).then(
        (r) => r.data.data
      ),
    staleTime: 3 * 60 * 1000,
  })
  const activeYear = academicYears?.find((y) => y.is_active)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['institutions', institutionId, 'assignment-grid'] })

  const assign = useMutation({
    mutationFn: (vars: { groupId: number; subjectId: number; userId: number }) =>
      api.post(`/institutions/${institutionId}/assign-course`, {
        group_id: vars.groupId,
        subject_id: vars.subjectId,
        user_id: vars.userId,
        academic_year_id: activeYear?.id,
      }),
    onSuccess: () => {
      toast.success('Curso asignado.')
      invalidate()
    },
    onError: () => toast.error('No pudimos asignar el curso.'),
  })

  const unassign = useMutation({
    mutationFn: (vars: { groupId: number; subjectId: number }) =>
      api.delete(`/institutions/${institutionId}/unassign-course`, {
        data: { group_id: vars.groupId, subject_id: vars.subjectId, academic_year_id: activeYear?.id },
      }),
    onSuccess: () => {
      toast.success('Asignación removida.')
      invalidate()
    },
    onError: () => toast.error('No pudimos quitar la asignación.'),
  })

  if (!grid) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">Cargando...</CardContent>
      </Card>
    )
  }

  const available = new Set(grid.available_pairs.map((p) => pairKey(p.group_id, p.subject_id)))
  const visibleGroups = grid.groups.filter((g) => !shiftFilter || g.shift_id === shiftFilter)

  if (grid.groups.length === 0 || grid.subjects.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Crea al menos un grupo y una materia para poder asignar cursos a los docentes.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asignaciones</CardTitle>
      </CardHeader>
      <CardContent>
        {!activeYear && (
          <p className="mb-3 rounded-md bg-warning/10 px-3 py-2 text-sm text-warning">
            No hay un año académico activo — no se pueden crear asignaciones nuevas.
          </p>
        )}
        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {grid.shifts.length > 1 && (
            <label className="flex items-center gap-2">
              Jornada:
              <select
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">Todas</option>
                {grid.shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <span>"No aplica": la materia no está vinculada al grado del grupo (se vincula en Materias).</span>
        </div>
        {/* Scroll propio (alto máximo) para que el encabezado de materias quede fijo
            al bajar: un sticky top dentro de overflow-x-auto se pega a este
            contenedor, no a la página, así que el contenedor debe tener su scroll vertical. */}
        <div className="max-h-[70vh] overflow-auto rounded-lg border">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 min-w-[140px] border-b border-r bg-card px-3 py-2 text-left">
                  Grupo
                </th>
                {grid.subjects.map((s) => (
                  <th
                    key={s.id}
                    className="sticky top-0 z-20 min-w-[180px] border-b border-l px-3 py-2 text-center text-white"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleGroups.map((g) => (
                <tr key={g.id} className="hover:bg-muted/30">
                  <td className="sticky left-0 z-10 border-b border-r bg-card px-3 py-2 font-medium">
                    {groupLabel(grid, g)}
                  </td>
                  {grid.subjects.map((s) => {
                    const assignment = grid.assignments.find((a) => a.group_id === g.id && a.subject_id === s.id)
                    const applies = available.has(pairKey(g.id, s.id))
                    return (
                      <td
                        key={s.id}
                        className={`min-w-[180px] border-b border-l p-2 text-center ${!applies && !assignment ? 'bg-muted/40' : ''}`}
                      >
                        {!applies && !assignment ? (
                          <span className="text-xs text-muted-foreground">No aplica</span>
                        ) : assignment ? (
                          <div className="flex items-center justify-center gap-1">
                            <span className="truncate text-sm">{assignment.teacher?.name ?? '—'}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              disabled={unassign.isPending}
                              onClick={() => unassign.mutate({ groupId: g.id, subjectId: s.id })}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <SearchableSelect
                            value=""
                            onChange={(userId) => assign.mutate({ groupId: g.id, subjectId: s.id, userId })}
                            options={teacherOptions}
                            placeholder="Sin asignar"
                            disabled={!activeYear || assign.isPending}
                          />
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
