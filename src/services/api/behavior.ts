import { api } from '@/services/api/client'
import type { BehaviorAnnotation, BehaviorCategory, BehaviorType } from '@/types/behavior'

export interface BehaviorFilters {
  groupId: number
  type?: BehaviorType
  category?: BehaviorCategory
  studentId?: number
  date?: string
}

export interface BehaviorPayload {
  student_id: number
  group_id: number
  group_subject_id?: number
  date: string
  type: BehaviorType
  category: BehaviorCategory
  title: string
  description: string
  action_taken?: string
  requires_parent_contact?: boolean
}

export const behaviorApi = {
  list: (filters: BehaviorFilters) =>
    api.get<{ data: BehaviorAnnotation[] }>('/behavior', { params: filters }).then((r) => r.data.data),

  create: (payload: BehaviorPayload) =>
    api.post<{ data: BehaviorAnnotation }>('/behavior', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<Omit<BehaviorPayload, 'student_id' | 'group_id' | 'group_subject_id'>>) =>
    api.put<{ data: BehaviorAnnotation }>(`/behavior/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) => api.delete(`/behavior/${id}`),

  markContacted: (id: number) =>
    api.patch<{ data: BehaviorAnnotation }>(`/behavior/${id}/mark-contacted`).then((r) => r.data.data),
}
