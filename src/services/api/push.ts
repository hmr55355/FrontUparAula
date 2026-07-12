import { api } from '@/services/api/client'

export const pushApi = {
  vapidPublicKey: () => api.get<{ publicKey: string }>('/push/vapid-public-key').then((r) => r.data),

  subscribe: (subscription: PushSubscriptionJSON) => api.post('/push-subscriptions', subscription),

  unsubscribe: (endpoint: string) => api.delete('/push-subscriptions', { data: { endpoint } }),
}
