import { Navigate, Link } from 'react-router-dom'
import { ClipboardList, Users, BarChart3 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'

const FEATURES = [
  {
    icon: ClipboardList,
    title: 'Notas en segundos',
    description: 'Registra calificaciones desde tu celular con un solo toque',
  },
  {
    icon: BarChart3,
    title: 'Planilla automática',
    description: 'Tu plantilla institucional, generada automáticamente al instante',
  },
  {
    icon: Users,
    title: 'Gestión completa',
    description: 'Asistencia, comportamiento, citaciones y más en un solo lugar',
  },
]

export function PublicHome() {
  const token = useAuthStore((s) => s.token)

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-heading text-lg font-semibold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            UA
          </span>
          UparAula
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link to="/login">Iniciar sesión</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Crear cuenta</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <div>
          <h1 className="text-4xl font-bold sm:text-5xl">Tu aula en la palma de tu mano</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Calificaciones, asistencia, comportamiento y citaciones a padres — todo desde el celular, en segundos.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/register">Crear cuenta</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-lg border bg-card p-5 text-left shadow-sm">
              <Icon className="h-7 w-7 text-primary" />
              <h2 className="mt-3 text-base font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        © 2026 UparAula · Desarrollado por UparTechnology
      </footer>
    </div>
  )
}
