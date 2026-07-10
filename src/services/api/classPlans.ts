import { api } from '@/services/api/client'
import type { ClassPlan, ClassPlanStatus } from '@/types/classPlans'

export interface ClassPlanPayload {
  group_subject_id: number
  date: string
  topic: string
  objectives?: string
  activities?: string
  resources?: string
  class_schedule_id?: number
}

export interface ClassPlanUpdatePayload {
  topic?: string
  objectives?: string | null
  activities?: string | null
  resources?: string | null
  what_was_done?: string | null
  pending_for_next_class?: string | null
  attendance_note?: string | null
  homework_assigned?: string | null
  notes?: string | null
  status?: ClassPlanStatus
}

export const classPlansApi = {
  list: (groupSubjectId: number, from: string, to: string) =>
    api
      .get<{ data: ClassPlan[] }>('/class-plans', { params: { groupSubjectId, from, to } })
      .then((r) => r.data.data),

  create: (payload: ClassPlanPayload) => api.post<{ data: ClassPlan }>('/class-plans', payload).then((r) => r.data.data),

  update: (id: number, payload: ClassPlanUpdatePayload) =>
    api.put<{ data: ClassPlan }>(`/class-plans/${id}`, payload).then((r) => r.data.data),

  updateStatus: (id: number, status: ClassPlanStatus) =>
    api.patch<{ data: ClassPlan }>(`/class-plans/${id}/status`, { status }).then((r) => r.data.data),

  previous: (groupSubjectId: number) =>
    api.get<{ data: ClassPlan | null }>('/class-plans/previous', { params: { groupSubjectId } }).then((r) => r.data.data),

  duplicateAsBase: (id: number) =>
    api.post<{ data: ClassPlan }>(`/class-plans/${id}/duplicate-as-base`).then((r) => r.data.data),
}
