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
  list: (studentId: number, periodId?: number) =>
    api
      .get<{ data: StudentObservation[] }>('/observations', { params: { studentId, periodId } })
      .then((r) => r.data.data),

  create: (payload: ObservationPayload) =>
    api.post<{ data: StudentObservation }>('/observations', payload).then((r) => r.data.data),
}
