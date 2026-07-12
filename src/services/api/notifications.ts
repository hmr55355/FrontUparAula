import { api } from '@/services/api/client'
import type { PaginatedNotifications } from '@/types/notifications'

export const notificationsApi = {
  list: () => api.get<PaginatedNotifications>('/notifications').then((r) => r.data),

  markRead: (id: number) => api.patch(`/notifications/${id}/read`),

  markAllRead: () => api.patch('/notifications/read-all'),
}
