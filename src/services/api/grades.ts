import { api } from '@/services/api/client'
import type { Grade, GradeSheetResponse, PeriodFinal, SectionFinal } from '@/types/grades'

export const gradesApi = {
  sheet: (groupSubjectId: number, periodId: number) =>
    api
      .get<GradeSheetResponse>('/grades', { params: { groupSubjectId, periodId } })
      .then((r) => r.data),

  save: (payload: { student_id: number; grade_column_id: number; score: number | null; notes?: string }) =>
    api.post<{ data: Grade }>('/grades', payload).then((r) => r.data.data),

  bulk: (grades: Array<{ student_id: number; grade_column_id: number; score: number | null }>) =>
    api.post<{ data: Grade[]; count: number }>('/grades/bulk', { grades }).then((r) => r.data),

  recalculate: (groupSubjectId: number, periodId: number) =>
    api.post('/period-finals/calculate', null, { params: { groupSubjectId, periodId } }),

  adjustSectionFinal: (id: number, payload: { section_final: number; adjustment_reason: string }) =>
    api.put<{ data: SectionFinal }>(`/section-finals/${id}/adjust`, payload).then((r) => r.data.data),

  excelTemplate: (groupSubjectId: number, periodId: number) =>
    api
      .get<Blob>('/grades/excel-template', { params: { groupSubjectId, periodId }, responseType: 'blob' })
      .then((r) => r.data),

  excelImport: (groupSubjectId: number, periodId: number, file: File) => {
    const form = new FormData()
    form.append('groupSubjectId', String(groupSubjectId))
    form.append('periodId', String(periodId))
    form.append('file', file)
    return api
      .post<{ saved: number; skipped: number; errors: string[] }>('/grades/excel-import', form)
      .then((r) => r.data)
  },

  adjustPeriodFinal: (id: number, payload: { period_final: number; adjustment_reason: string }) =>
    api.put<{ data: PeriodFinal }>(`/period-finals/${id}/adjust`, payload).then((r) => r.data.data),
}
