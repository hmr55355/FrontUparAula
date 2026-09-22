import { api } from '@/services/api/client'
import type { MonitorCourse, MonitorRosterResponse, MonitorSubmission, SubmissionType } from '@/types/monitors'

/** API de la cuenta de monitor de curso (rutas /monitor). */
export const monitorAppApi = {
  courses: () => api.get<{ data: MonitorCourse[] }>('/monitor/courses').then((r) => r.data.data),

  roster: (courseMonitorId: number, date?: string) =>
    api
      .get<MonitorRosterResponse>(`/monitor/courses/${courseMonitorId}/roster`, { params: date ? { date } : undefined })
      .then((r) => r.data),

  submit: (courseMonitorId: number, type: SubmissionType, payload: object) =>
    api
      .post<{ data: MonitorSubmission }>(`/monitor/courses/${courseMonitorId}/submissions`, { type, payload })
      .then((r) => r.data.data),

  submissions: () => api.get<{ data: MonitorSubmission[] }>('/monitor/submissions').then((r) => r.data.data),

  cancel: (id: number) => api.delete(`/monitor/submissions/${id}`),
}
