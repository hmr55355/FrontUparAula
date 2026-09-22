import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import axios from 'axios'

import { AuthLayout } from '@/pages/auth/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authApi } from '@/services/api/auth'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  // Correo (docentes) o usuario (monitores de curso).
  email: z.string().trim().min(1, 'Escribe tu correo o usuario'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

type FormValues = z.infer<typeof schema>

export function Login() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true)
    try {
      const { user, token } = await authApi.login(values)
      setSession(user, token)
      navigate(user.account_type === 'monitor' ? '/monitor' : '/dashboard')
    } catch (error) {
      const message =
        (axios.isAxiosError(error) && error.response?.data?.errors?.email?.[0]) ||
        'Las credenciales no coinciden con nuestros registros.'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Inicia sesión" subtitle="Ingresa a tu cuenta de UparAula">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo o usuario</Label>
          <Input id="email" type="text" autoCapitalize="none" autoComplete="username" {...register('email')} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" {...register('password')} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <Link to="/forgot-password" className="text-sm text-primary hover:underline">
          ¿Olvidaste tu contraseña?
        </Link>
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Ingresando...' : 'Iniciar sesión'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="text-primary hover:underline">
          Crea una aquí
        </Link>
      </p>
    </AuthLayout>
  )
}
