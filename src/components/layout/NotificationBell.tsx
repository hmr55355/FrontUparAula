import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { notificationsApi } from '@/services/api/notifications'
import type { NotificationPriority } from '@/types/notifications'

const PRIORITY_DOT: Record<NotificationPriority, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    refetchInterval: 60_000,
  })

  const notifications = data?.data ?? []
  const unreadCount = notifications.filter((n) => !n.read_at).length

  const markRead = async (id: number) => {
    await notificationsApi.markRead(id)
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const markAllRead = async () => {
    await notificationsApi.markAllRead()
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" aria-label="Notificaciones" onClick={() => setOpen((v) => !v)}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-red-500" />
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 max-h-96 w-80 overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-sm font-semibold">Notificaciones</span>
              {unreadCount > 0 && (
                <button className="text-xs text-primary hover:underline" onClick={markAllRead}>
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin notificaciones.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex w-full flex-col gap-0.5 rounded px-3 py-2 text-left text-sm hover:bg-muted ${n.read_at ? 'opacity-60' : ''}`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${PRIORITY_DOT[n.priority]}`} />
                    {n.title}
                  </span>
                  <span className="pl-4 text-xs text-muted-foreground">{n.body}</span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
