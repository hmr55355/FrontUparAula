import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useState } from 'react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'
import { useAvatarUrl } from '@/hooks/useAvatarUrl'
import { UserCircle } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2, 'Requerido'),
  phone: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

export function Profile() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const { data } = await api.put('/auth/profile', values)
      setUser(data.data)
      toast.success('Perfil actualizado.')
    } catch {
      toast.error('No pudimos actualizar tu perfil.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <AvatarCard />
      <Card>
        <CardHeader>
          <CardTitle>Mi perfil</CardTitle>
          <CardDescription>Actualiza tus datos personales</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input value={user?.email ?? ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full sm:w-fit">
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mis instituciones</CardTitle>
          <CardDescription>Instituciones a las que perteneces (solo lectura)</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {user?.institutions?.length ? (
            user.institutions.map((m) => (
              <div key={m.institution_id} className="flex items-center justify-between rounded-md border p-3">
                <span>{m.institution_name}</span>
                <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>{m.role}</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Aún no perteneces a ninguna institución.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Foto de perfil: se ve en el encabezado. Se sube como multipart (POST + _method=PUT, igual que el logo). */
function AvatarCard() {
  const setUser = useAuthStore((s) => s.setUser)
  const avatarUrl = useAvatarUrl()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const pick = (selected: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(selected)
    setPreview(selected ? URL.createObjectURL(selected) : null)
  }

  const upload = async (remove = false) => {
    setSaving(true)
    try {
      const form = new FormData()
      form.append('_method', 'PUT')
      if (remove) form.append('remove_avatar', '1')
      else if (file) form.append('avatar', file)
      const { data } = await api.post('/auth/profile', form)
      setUser(data.data)
      pick(null)
      toast.success(remove ? 'Foto quitada.' : 'Foto actualizada.')
    } catch {
      toast.error('No pudimos guardar la foto. Usa una imagen de máximo 2 MB.')
    } finally {
      setSaving(false)
    }
  }

  const shown = preview ?? avatarUrl

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto de perfil</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        {shown ? (
          <img src={shown} alt="Tu foto de perfil" className="h-20 w-20 rounded-full border object-cover" />
        ) : (
          <UserCircle className="h-20 w-20 text-muted-foreground" />
        )}
        <div className="flex flex-col gap-2">
          <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => upload()} disabled={!file || saving}>
              {saving ? 'Guardando...' : 'Guardar foto'}
            </Button>
            {avatarUrl && !file && (
              <Button size="sm" variant="ghost" onClick={() => upload(true)} disabled={saving}>
                Quitar foto
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

