import { api } from '@/services/api/client'
import type { Grade, GradeSheetResponse } from '@/types/grades'

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
}
