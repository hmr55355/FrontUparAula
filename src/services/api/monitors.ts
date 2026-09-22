import { api } from '@/services/api/client'
import type {
  CourseMonitor,
  MonitorSubmission,
  ParticipationRow,
  ParticipationsResponse,
  SubmissionDetailResponse,
  SubmissionStatus,
} from '@/types/monitors'

/** Lado del docente: monitores de sus cursos, revisión de envíos y participaciones. */
export const monitorsApi = {
  list: (groupSubjectId: number) =>
    api.get<{ data: CourseMonitor[] }>(`/group-subjects/${groupSubjectId}/monitors`).then((r) => r.data.data),

  create: (groupSubjectId: number, payload: { student_id: number; username: string; password: string }) =>
    api.post<{ data: CourseMonitor }>(`/group-subjects/${groupSubjectId}/monitors`, payload).then((r) => r.data.data),

  update: (id: number, payload: { is_active?: boolean; password?: string }) =>
    api.patch<{ data: CourseMonitor }>(`/course-monitors/${id}`, payload).then((r) => r.data.data),

  submissions: (status: SubmissionStatus = 'pending') =>
    api.get<{ data: MonitorSubmission[] }>('/monitor-submissions', { params: { status } }).then((r) => r.data.data),

  submission: (id: number) => api.get<SubmissionDetailResponse>(`/monitor-submissions/${id}`).then((r) => r.data),

  approve: (id: number) => api.post(`/monitor-submissions/${id}/approve`),

  reject: (id: number, notes?: string) => api.post(`/monitor-submissions/${id}/reject`, { notes }),
}

export const participationsApi = {
  list: (groupSubjectId: number, periodId: number) =>
    api.get<ParticipationsResponse>('/participations', { params: { groupSubjectId, periodId } }).then((r) => r.data),

  create: (payload: { group_subject_id: number; student_id: number; date: string; points?: number }) =>
    api.post<{ data: ParticipationRow }>('/participations', payload).then((r) => r.data.data),

  remove: (id: number) => api.delete(`/participations/${id}`),
}
