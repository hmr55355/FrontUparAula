import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { AuthLayout } from '@/pages/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/services/api/auth'

const schema = z
  .object({
    email: z.string().email('Correo inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    password_confirmation: z.string(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirmation'],
  })

type FormValues = z.infer<typeof schema>

export function ResetPassword() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: searchParams.get('email') ?? '' },
  })

  const onSubmit = async (values: FormValues) => {
    if (!token) return
    setSubmitting(true)
    try {
      await authApi.resetPassword({ ...values, token })
      toast.success('Contraseña actualizada. Ahora puedes iniciar sesión.')
      navigate('/login')
    } catch {
      toast.error('El token de recuperación no es válido o expiró.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Nueva contraseña" subtitle="Escribe tu nueva contraseña">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" inputMode="email" {...register('email')} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Nueva contraseña</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
          <Input id="password_confirmation" type="password" {...register('password_confirmation')} />
          {errors.password_confirmation && (
            <p className="text-sm text-destructive">{errors.password_confirmation.message}</p>
          )}
        </div>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Guardando...' : 'Actualizar contraseña'}
        </Button>
      </form>
    </AuthLayout>
  )
}
