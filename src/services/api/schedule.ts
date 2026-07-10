import { api } from '@/services/api/client'
import type { ClassScheduleBlock, CurrentClassResponse } from '@/types/schedule'

export interface ScheduleBlockPayload {
  group_subject_id: number
  day_of_week: number
  start_time: string
  end_time: string
  classroom?: string
  block_label?: string
  academic_year_id: number
  confirm?: boolean
}

export const scheduleApi = {
  list: (dayOfWeek?: number) =>
    api
      .get<{ data: ClassScheduleBlock[] }>('/schedule', { params: dayOfWeek ? { dayOfWeek } : undefined })
      .then((r) => r.data.data),

  create: (payload: ScheduleBlockPayload) =>
    api.post<{ data: ClassScheduleBlock; warnings: string[] }>('/schedule', payload).then((r) => r.data),

  update: (id: number, payload: ScheduleBlockPayload) =>
    api.put<{ data: ClassScheduleBlock; warnings: string[] }>(`/schedule/${id}`, payload).then((r) => r.data),

  remove: (id: number) => api.delete(`/schedule/${id}`),

  duplicateDay: (fromDay: number, toDay: number) =>
    api.post('/schedule/duplicate-day', { from_day: fromDay, to_day: toDay }),

  currentClass: () => api.get<CurrentClassResponse>('/schedule/current-class').then((r) => r.data),
}
