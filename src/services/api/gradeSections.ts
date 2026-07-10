import { api } from '@/services/api/client'
import type { GradeSection, GradeSectionDraft } from '@/types/grades'

export const gradeSectionsApi = {
  list: (groupSubjectId: number, periodId: number) =>
    api
      .get<{ data: GradeSection[] }>('/grade-sections', { params: { groupSubjectId, periodId } })
      .then((r) => r.data.data),

  bulkSave: (payload: {
    group_subject_id: number
    period_id: number
    sections: GradeSectionDraft[]
    confirm_delete?: boolean
  }) => api.post<{ data: GradeSection[] }>('/grade-sections/bulk-save', payload).then((r) => r.data.data),

  copyFromPeriod: (payload: { group_subject_id: number; from_period_id: number; to_period_id: number }) =>
    api.post<{ data: GradeSection[] }>('/grade-sections/copy-from-period', payload).then((r) => r.data.data),
}
