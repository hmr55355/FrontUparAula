import { api } from '@/services/api/client'
import type { ObservationType, StudentObservation } from '@/types/observations'

export interface ObservationPayload {
  student_id: number
  group_id: number
  period_id?: number
  date: string
  type: ObservationType
  content: string
  is_private?: boolean
}

export const observationsApi = {
  list: (params: { studentId?: number; groupId?: number; periodId?: number }) =>
    api.get<{ data: StudentObservation[] }>('/observations', { params }).then((r) => r.data.data),

  create: (payload: ObservationPayload) =>
    api.post<{ data: StudentObservation }>('/observations', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<Pick<ObservationPayload, 'type' | 'content' | 'is_private'>>) =>
    api.put<{ data: StudentObservation }>(`/observations/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) => api.delete(`/observations/${id}`),
}
