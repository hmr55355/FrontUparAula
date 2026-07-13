import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { api } from '@/services/api/client'
import { institutionsApi } from '@/services/api/institutions'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'

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
        <TabsList>
          <TabsTrigger value="teachers">Docentes</TabsTrigger>
          <TabsTrigger value="groups">Grupos</TabsTrigger>
          <TabsTrigger value="subjects">Materias</TabsTrigger>
        </TabsList>
        <TabsContent value="teachers">
          <TeachersPanel institutionId={institution.id} />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsPanel institutionId={institution.id} />
        </TabsContent>
        <TabsContent value="subjects">
          <SubjectsPanel institutionId={institution.id} />
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
                <TableCell>
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

interface GroupRow {
  id: number
  name: string
  grade_level: string
  section: string | null
  student_count: number
}

function GroupsPanel({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')

  const { data: groups } = useQuery({
    queryKey: ['groups', institutionId],
    queryFn: () => api.get<{ data: GroupRow[] }>('/groups', { params: { institutionId } }).then((r) => r.data.data),
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

  const createGroup = useMutation({
    mutationFn: () =>
      api.post('/groups', {
        institution_id: institutionId,
        academic_year_id: activeYear?.id,
        name,
        grade_level: gradeLevel,
      }),
    onSuccess: () => {
      toast.success('Grupo creado.')
      setName('')
      setGradeLevel('')
      queryClient.invalidateQueries({ queryKey: ['groups', institutionId] })
    },
    onError: () => toast.error('No pudimos crear el grupo.'),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grupos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <div className="space-y-1">
            <Label htmlFor="group-name">Nombre</Label>
            <Input id="group-name" placeholder="10-01" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="group-grade">Grado</Label>
            <Input id="group-grade" placeholder="10" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} />
          </div>
          <Button
            className="self-end"
            onClick={() => createGroup.mutate()}
            disabled={!name || !gradeLevel || !activeYear || createGroup.isPending}
          >
            Agregar grupo
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Grado</TableHead>
              <TableHead>Estudiantes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups?.map((g) => (
              <TableRow key={g.id}>
                <TableCell>{g.name}</TableCell>
                <TableCell>{g.grade_level}</TableCell>
                <TableCell>{g.student_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

interface SubjectRow {
  id: number
  name: string
  color: string
}

function SubjectsPanel({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')

  const { data: subjects } = useQuery({
    queryKey: ['subjects', institutionId],
    queryFn: () => api.get<{ data: SubjectRow[] }>('/subjects', { params: { institutionId } }).then((r) => r.data.data),
    staleTime: 3 * 60 * 1000,
  })

  const createSubject = useMutation({
    mutationFn: () => api.post('/subjects', { institution_id: institutionId, name }),
    onSuccess: () => {
      toast.success('Materia creada.')
      setName('')
      queryClient.invalidateQueries({ queryKey: ['subjects', institutionId] })
    },
    onError: () => toast.error('No pudimos crear la materia.'),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Materias</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Input placeholder="Nombre de la materia" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => createSubject.mutate()} disabled={!name || createSubject.isPending}>
            Agregar materia
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {subjects?.map((s) => (
            <Badge key={s.id} style={{ backgroundColor: s.color, color: '#fff', borderColor: 'transparent' }}>
              {s.name}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
