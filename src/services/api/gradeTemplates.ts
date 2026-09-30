import { api } from '@/services/api/client'
import type { GradeSection, GradeTemplate } from '@/types/grades'

export const gradeTemplatesApi = {
  list: (institutionId: number) =>
    api.get<{ data: GradeTemplate[] }>('/grade-templates', { params: { institutionId } }).then((r) => r.data.data),

  save: (payload: { group_subject_id: number; period_id: number; name: string; description?: string; is_shared?: boolean }) =>
    api.post<{ data: GradeTemplate }>('/grade-templates', payload).then((r) => r.data.data),

  update: (id: number, payload: { name?: string; is_shared?: boolean }) =>
    api.put<{ data: GradeTemplate }>(`/grade-templates/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) => api.delete(`/grade-templates/${id}`),

  apply: (templateId: number, groupSubjectId: number, periodId: number) =>
    api
      .post<{ data: GradeSection[] }>(`/grade-templates/${templateId}/apply`, {
        group_subject_id: groupSubjectId,
        period_id: periodId,
      })
      .then((r) => r.data.data),
}
