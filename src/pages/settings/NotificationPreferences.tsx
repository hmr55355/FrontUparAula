import { useState } from 'react'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { authApi } from '@/services/api/auth'
import { usePushSubscription } from '@/hooks/usePushSubscription'
import { useAuthStore } from '@/store/authStore'

const NOTIFICATION_TYPES: Array<{ key: string; label: string }> = [
  { key: 'missing_attendance', label: 'Asistencia del día sin registrar' },
  { key: 'today_citation', label: 'Citaciones programadas para hoy' },
  { key: 'uncontacted_behavior', label: 'Anotaciones sin contactar al acudiente (+7 días)' },
  { key: 'closing_period', label: 'Períodos por cerrar con columnas sin calificar' },
  { key: 'missing_homework', label: 'Tareas vencidas sin calificar' },
  { key: 'upcoming_class_push', label: 'Aviso push 5 minutos antes de cada clase' },
]

export function NotificationPreferences() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const [saving, setSaving] = useState(false)
  const push = usePushSubscription()

  const preferences = user?.notification_preferences ?? {}

  const toggle = async (key: string) => {
    const next = { ...preferences, [key]: preferences[key] === false ? true : false }
    setSaving(true)
    try {
      const updated = await authApi.updateNotificationPreferences(next)
      setUser(updated)
    } catch {
      toast.error('No pudimos actualizar tus preferencias.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notificaciones</CardTitle>
        <CardDescription>Activa o desactiva cada tipo de alerta</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          {NOTIFICATION_TYPES.map(({ key, label }) => {
            const enabled = preferences[key] !== false
            return (
              <label key={key} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                {label}
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={saving}
                  onChange={() => toggle(key)}
                  className="h-5 w-5"
                />
              </label>
            )
          })}
        </div>

        <div className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">Notificaciones push del navegador</p>
          {!push.isSupported ? (
            <p className="text-sm text-muted-foreground">Tu navegador no soporta notificaciones push.</p>
          ) : (
            <Button
              size="sm"
              variant={push.isSubscribed ? 'outline' : 'default'}
              disabled={push.loading}
              onClick={push.isSubscribed ? push.unsubscribe : push.subscribe}
            >
              {push.isSubscribed ? 'Desactivar push en este dispositivo' : 'Activar push en este dispositivo'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
