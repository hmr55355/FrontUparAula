import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Building2, KeyRound, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { institutionsApi } from '@/services/api/institutions'
import type { Institution } from '@/types'

type Path = 'choose' | 'create' | 'join' | 'invite' | 'done'

const createSchema = z.object({
  name: z.string().min(2, 'Requerido'),
  city: z.string().min(2, 'Requerido'),
  department: z.string().min(2, 'Requerido'),
  nit: z.string().optional(),
  rector: z.string().optional(),
  academic_year: z.number().min(2000).max(2100),
  academic_year_start: z.string().min(1, 'Requerido'),
  academic_year_end: z.string().min(1, 'Requerido'),
})
type CreateFormValues = z.infer<typeof createSchema>

export function Onboarding() {
  const [path, setPath] = useState<Path>('choose')
  const navigate = useNavigate()

  if (path === 'choose') {
    return (
      <OnboardingShell title="Bienvenido a UparAula" subtitle="¿Ya tienes una institución registrada?">
        <div className="grid gap-4 sm:grid-cols-3">
          <ChoiceCard
            icon={Building2}
            title="Registrar mi institución"
            description="Soy el primer docente de mi institución en usar UparAula"
            onClick={() => setPath('create')}
          />
          <ChoiceCard
            icon={Search}
            title="Unirme a una institución existente"
            description="Buscar mi institución por nombre o NIT"
            onClick={() => setPath('join')}
          />
          <ChoiceCard
            icon={KeyRound}
            title="Tengo un código de invitación"
            description="Un administrador ya me invitó"
            onClick={() => setPath('invite')}
          />
        </div>
      </OnboardingShell>
    )
  }

  if (path === 'create') {
    return <CreateInstitutionStep onBack={() => setPath('choose')} onDone={() => setPath('done')} />
  }

  if (path === 'join') {
    return <JoinInstitutionStep onBack={() => setPath('choose')} onDone={() => setPath('done')} />
  }

  if (path === 'invite') {
    return <AcceptInvitationStep onBack={() => setPath('choose')} onDone={() => setPath('done')} />
  }

  return (
    <OnboardingShell title="¡Todo listo!" subtitle="Ya puedes ir a tu dashboard">
      <Button className="w-full" onClick={() => navigate('/dashboard')}>
        Ir al dashboard
      </Button>
    </OnboardingShell>
  )
}

function OnboardingShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2 font-heading text-lg font-semibold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            UA
          </span>
          UparAula
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  )
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof Building2
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
    >
      <Icon className="h-6 w-6 text-primary" />
      <span className="font-medium">{title}</span>
      <span className="text-sm text-muted-foreground">{description}</span>
    </button>
  )
}

function CreateInstitutionStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { academic_year: new Date().getFullYear() },
  })

  const onSubmit = async (values: CreateFormValues) => {
    setSubmitting(true)
    try {
      await institutionsApi.create(values)
      toast.success('Institución creada. Ya eres el administrador.')
      onDone()
    } catch {
      toast.error('No pudimos crear la institución. Revisa los datos.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <OnboardingShell title="Registra tu institución" subtitle="Configura los datos básicos y el año escolar activo">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Nombre de la institución</Label>
          <Input id="name" {...register('name')} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input id="city" {...register('city')} />
          {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Departamento</Label>
          <Input id="department" {...register('department')} />
          {errors.department && <p className="text-sm text-destructive">{errors.department.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="nit">NIT (opcional)</Label>
          <Input id="nit" {...register('nit')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rector">Rector (opcional)</Label>
          <Input id="rector" {...register('rector')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="academic_year">Año escolar</Label>
          <Input id="academic_year" type="number" {...register('academic_year', { valueAsNumber: true })} />
          {errors.academic_year && <p className="text-sm text-destructive">{errors.academic_year.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="academic_year_start">Inicio del año</Label>
          <Input id="academic_year_start" type="date" {...register('academic_year_start')} />
          {errors.academic_year_start && (
            <p className="text-sm text-destructive">{errors.academic_year_start.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="academic_year_end">Fin del año</Label>
          <Input id="academic_year_end" type="date" {...register('academic_year_end')} />
          {errors.academic_year_end && <p className="text-sm text-destructive">{errors.academic_year_end.message}</p>}
        </div>
        <div className="flex gap-3 sm:col-span-2">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            Atrás
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? 'Creando...' : 'Crear institución'}
          </Button>
        </div>
      </form>
    </OnboardingShell>
  )
}

function JoinInstitutionStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Institution[]>([])
  const [searching, setSearching] = useState(false)
  const [joining, setJoining] = useState<number | null>(null)

  const search = async () => {
    setSearching(true)
    try {
      const data = await institutionsApi.search({ name: query })
      setResults(data)
    } finally {
      setSearching(false)
    }
  }

  const join = async (institutionId: number) => {
    setJoining(institutionId)
    try {
      await institutionsApi.join(institutionId)
      toast.success('Solicitud enviada. El administrador debe aprobarla.')
      onDone()
    } catch {
      toast.error('No pudimos enviar la solicitud.')
    } finally {
      setJoining(null)
    }
  }

  return (
    <OnboardingShell title="Buscar mi institución" subtitle="Busca por nombre o NIT">
      <div className="flex gap-2">
        <Input
          placeholder="Nombre o NIT de la institución"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button onClick={search} disabled={searching}>
          {searching ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {results.map((institution) => (
          <div key={institution.id} className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium">{institution.name}</p>
              <p className="text-sm text-muted-foreground">
                {institution.city}, {institution.department}
              </p>
            </div>
            <Button size="sm" onClick={() => join(institution.id)} disabled={joining === institution.id}>
              Unirme
            </Button>
          </div>
        ))}
        {results.length === 0 && !searching && (
          <p className="text-sm text-muted-foreground">Busca tu institución para solicitar unirte.</p>
        )}
      </div>

      <Button type="button" variant="outline" onClick={onBack} className="mt-4 w-full">
        Atrás
      </Button>
    </OnboardingShell>
  )
}

function AcceptInvitationStep({ onBack, onDone }: { onBack: () => void; onDone: () => void }) {
  const [token, setToken] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const accept = async () => {
    setSubmitting(true)
    try {
      await institutionsApi.acceptInvitation(token)
      toast.success('¡Invitación aceptada!')
      onDone()
    } catch {
      toast.error('Código de invitación inválido.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <OnboardingShell title="Código de invitación" subtitle="Ingresa el código que te compartió el administrador">
      <div className="space-y-2">
        <Label htmlFor="token">Código de invitación</Label>
        <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} />
      </div>
      <div className="mt-4 flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1">
          Atrás
        </Button>
        <Button onClick={accept} disabled={submitting || !token} className="flex-1">
          {submitting ? 'Verificando...' : 'Aceptar invitación'}
        </Button>
      </div>
    </OnboardingShell>
  )
}
