import { api } from '@/services/api/client'
import type { DeliveryStatus, Homework, HomeworkDeliveriesResponse } from '@/types/homeworks'

export interface HomeworkPayload {
  group_subject_id: number
  period_id: number
  title: string
  description?: string
  assigned_date: string
  due_date: string
  max_score?: number
  is_graded?: boolean
  grade_section_id?: number
  weight?: number
  /** automatic: la columna nueva y las de la sección quedan con el mismo peso. */
  weight_mode?: 'manual' | 'automatic'
  notes?: string
}

export interface DeliveryPayload {
  student_id: number
  status: DeliveryStatus
  delivery_date?: string
  score?: number | null
  notes?: string
}

export const homeworksApi = {
  list: (groupSubjectId: number, periodId: number) =>
    api
      .get<{ data: Homework[] }>('/homeworks', { params: { groupSubjectId, periodId } })
      .then((r) => r.data.data),

  create: (payload: HomeworkPayload) => api.post<{ data: Homework }>('/homeworks', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<HomeworkPayload>) =>
    api.put<{ data: Homework }>(`/homeworks/${id}`, payload).then((r) => r.data.data),

  remove: (id: number, confirm?: boolean) => api.delete(`/homeworks/${id}`, { params: { confirm } }),

  deliveries: (homeworkId: number) =>
    api.get<HomeworkDeliveriesResponse>(`/homeworks/${homeworkId}/deliveries`).then((r) => r.data),

  bulkDeliveries: (homeworkId: number, deliveries: DeliveryPayload[]) =>
    api.post(`/homeworks/${homeworkId}/deliveries/bulk`, { deliveries }),
}
