export type NotificationPriority = 'info' | 'warning' | 'danger'

export interface AppNotification {
  id: number
  type: string
  title: string
  body: string
  data: Record<string, unknown> | null
  priority: NotificationPriority
  read_at: string | null
  created_at: string
}

export interface PaginatedNotifications {
  data: AppNotification[]
  current_page: number
  last_page: number
}
