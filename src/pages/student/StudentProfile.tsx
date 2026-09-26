import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Pencil, Plus, UserCircle } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { studentsApi } from '@/services/api/students'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { getGradeColor } from '@/utils/gradeHelpers'
import { BEHAVIOR_CATEGORY_LABELS, BEHAVIOR_TYPE_BADGE, BEHAVIOR_TYPE_LABELS } from '@/types/behavior'
import { OBSERVATION_TYPE_LABELS } from '@/types/observations'
import { CITATION_STATUS_BADGE, CITATION_STATUS_LABELS } from '@/types/citations'
import { PAYMENT_STATUS_BADGE, PAYMENT_STATUS_LABELS } from '@/types/copies'
import { NewObservationDialog } from '@/pages/student/NewObservationDialog'
import { NewCitationDialog } from '@/pages/citations/NewCitationDialog'
import { ParentDialog } from '@/pages/student/ParentDialog'
import { RELATIONSHIP_LABELS } from '@/types/parents'
import type { ParentGuardian } from '@/types/parents'

export function StudentProfile() {
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)
  const { course } = useActiveCourseGroup()
  const { data: institution } = useCurrentInstitution()
  const minPassing = institution?.min_passing_grade ? Number(institution.min_passing_grade) : 6.0

  const [observationDialogOpen, setObservationDialogOpen] = useState(false)
  const [citationDialogOpen, setCitationDialogOpen] = useState(false)
  // null = cerrado, 'new' = agregar, objeto = editar ese acudiente.
  const [parentDialog, setParentDialog] = useState<ParentGuardian | 'new' | null>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['student-profile', studentId],
    queryFn: () => studentsApi.fullProfile(studentId),
    enabled: !!studentId,
  })

  if (isLoading || !profile) {
    return <p className="text-sm text-muted-foreground">Cargando perfil...</p>
  }

  const { student } = profile
  const groupName = profile.grades[0]?.group_name

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <UserCircle className="h-14 w-14 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">
              {student.last_name} {student.first_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {groupName && `${groupName} · `}
              {student.document_type} {student.document_number}
            </p>
            <Badge variant={student.is_active ? 'success' : 'secondary'}>
              {student.is_active ? 'Activo' : 'Retirado'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="grades">
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="grades">Notas</TabsTrigger>
          <TabsTrigger value="attendance">Asistencia</TabsTrigger>
          <TabsTrigger value="behavior">Comportamiento</TabsTrigger>
          <TabsTrigger value="observations">Observaciones</TabsTrigger>
          <TabsTrigger value="parents">Acudientes</TabsTrigger>
          <TabsTrigger value="copies">Copias</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="flex flex-col gap-2">
          {profile.grades.length === 0 && <EmptyState text="Sin notas registradas todavía." />}
          {profile.grades.map((g) => {
            const numeric = g.period_final === null ? null : Number(g.period_final)
            const { background, text } = getGradeColor(numeric, minPassing)
            return (
              <Card key={g.group_subject_id}>
                <CardContent className="flex items-center justify-between py-3">
                  <span className="font-medium">{g.subject_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="rounded-md px-2 py-1 font-semibold" style={{ backgroundColor: background, color: text }}>
                      {numeric !== null ? numeric.toFixed(1) : '—'}
                    </span>
                    {profile.active_period && (
                      <Link
                        to={`/grades/${g.group_subject_id}/${profile.active_period.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Ver planilla →
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="attendance" className="flex flex-col gap-2">
          {profile.attendance_summary.length === 0 && <EmptyState text="Sin asistencia registrada todavía." />}
          {profile.attendance_summary.map((a) => (
            <Card key={a.group_subject_id}>
              <CardContent className="py-3">
                <p className="font-medium">{a.subject_name}</p>
                <p className="text-sm text-muted-foreground">
                  ✅ {a.presente} presente · ❌ {a.ausente_injustificado} injustificada · 📋 {a.ausente_justificado} justificada · 🕐 {a.tarde} tarde
                </p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="behavior" className="flex flex-col gap-2">
          {profile.behavior.length === 0 && <EmptyState text="Sin anotaciones en el año." />}
          {profile.behavior.map((b) => (
            <Card key={b.id}>
              <CardContent className="flex flex-col gap-1 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{b.title}</span>
                  <Badge variant={BEHAVIOR_TYPE_BADGE[b.type]}>{BEHAVIOR_TYPE_LABELS[b.type]}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {BEHAVIOR_CATEGORY_LABELS[b.category]} · {b.date.slice(0, 10)}
                  {b.teacher_name && ` · ${b.teacher_name}`}
                </p>
                <p className="text-sm">{b.description}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="observations" className="flex flex-col gap-2">
          <Button size="sm" className="w-fit" onClick={() => setObservationDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva observación
          </Button>
          {profile.observations.length === 0 && <EmptyState text="Sin observaciones registradas." />}
          {profile.observations.map((o) => (
            <Card key={o.id}>
              <CardContent className="flex flex-col gap-1 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{OBSERVATION_TYPE_LABELS[o.type]}</span>
                  {o.is_private && <Badge variant="secondary">🔒 Privada</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {o.date.slice(0, 10)}
                  {o.teacher_name && ` · ${o.teacher_name}`}
                </p>
                <p className="text-sm">{o.content}</p>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="parents" className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="w-fit" onClick={() => setCitationDialogOpen(true)} disabled={!course}>
              <Plus className="h-4 w-4" /> Nueva citación
            </Button>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setParentDialog('new')}>
              <Plus className="h-4 w-4" /> Agregar acudiente
            </Button>
          </div>

          {profile.parents.length === 0 && <EmptyState text="Sin acudientes registrados." />}
          {profile.parents.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-2 py-3">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {p.first_name} {p.last_name}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {RELATIONSHIP_LABELS[p.relationship] ?? p.relationship}
                    </span>
                  </span>
                  {p.email && <span className="text-xs text-muted-foreground">{p.email}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-right text-sm text-muted-foreground">
                    {p.phone}
                    {p.phone_alt && <span className="block text-xs">{p.phone_alt}</span>}
                  </span>
                  <button
                    type="button"
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Editar acudiente"
                    onClick={() => setParentDialog(p)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
          {parentDialog && (
            <ParentDialog
              key={parentDialog === 'new' ? 'new' : parentDialog.id}
              open
              onOpenChange={(open) => !open && setParentDialog(null)}
              studentId={studentId}
              parent={parentDialog === 'new' ? undefined : parentDialog}
            />
          )}

          {profile.citations.length > 0 && (
            <>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">Historial de citaciones</p>
              {profile.citations.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <span className="text-sm">{c.reason}</span>
                    <Badge variant={CITATION_STATUS_BADGE[c.status]}>{CITATION_STATUS_LABELS[c.status]}</Badge>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        <TabsContent value="copies" className="flex flex-col gap-2">
          {profile.copy_payments.length === 0 && <EmptyState text="Sin cobros de copias registrados." />}
          {profile.copy_payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{p.copy_charge?.description}</p>
                  <p className="text-sm text-muted-foreground">
                    {p.copy_charge?.charge_date.slice(0, 10)} · ${Number(p.copy_charge?.total_amount ?? 0).toLocaleString('es-CO')}
                  </p>
                </div>
                <Badge variant={PAYMENT_STATUS_BADGE[p.status]}>{PAYMENT_STATUS_LABELS[p.status]}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <NewObservationDialog
        open={observationDialogOpen}
        onOpenChange={setObservationDialogOpen}
        presetStudentId={studentId}
        groupId={course?.group_id ?? 0}
        periodId={profile.active_period?.id}
      />

      {course && (
        <NewCitationDialog
          open={citationDialogOpen}
          onOpenChange={setCitationDialogOpen}
          groupId={course.group_id}
          presetStudentId={studentId}
        />
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-8 text-center text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  )
}
