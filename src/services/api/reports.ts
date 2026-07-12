import { api } from '@/services/api/client'
import type { Report, ReportFormat } from '@/types/reports'

export const reportsApi = {
  createGradeSheet: (payload: { group_subject_id: number; period_id: number; format: ReportFormat }) =>
    api.post<{ data: { id: number } }>('/reports/grade-sheet', payload).then((r) => r.data.data),

  createStudentBulletin: (payload: { student_id: number; period_id: number }) =>
    api.post<{ data: { id: number } }>('/reports/student-bulletin', payload).then((r) => r.data.data),

  createAttendanceSheet: (payload: { group_subject_id: number; period_id: number; format: ReportFormat }) =>
    api.post<{ data: { id: number } }>('/reports/attendance-sheet', payload).then((r) => r.data.data),

  createBehaviorCitations: (payload: { group_id: number; period_id: number; format: ReportFormat }) =>
    api.post<{ data: { id: number } }>('/reports/behavior-citations', payload).then((r) => r.data.data),

  createAcademicRisk: (payload: { institution_id: number; period_id: number; format: ReportFormat }) =>
    api.post<{ data: { id: number } }>('/reports/academic-risk', payload).then((r) => r.data.data),

  status: (id: number) => api.get<{ data: Report }>(`/reports/${id}`).then((r) => r.data.data),

  downloadBlob: (id: number) => api.get(`/reports/${id}/download`, { responseType: 'blob' }).then((r) => r.data as Blob),
}
