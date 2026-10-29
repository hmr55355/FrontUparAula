import { api } from '@/services/api/client'
import type {
  Grade,
  GradeColumn,
  GradeConvention,
  GradeSheetResponse,
  PeriodFinal,
  SectionFinal,
  WorkGroup,
  WorkGroupDraft,
} from '@/types/grades'

export const gradesApi = {
  sheet: (groupSubjectId: number, periodId: number) =>
    api
      .get<GradeSheetResponse>('/grades', { params: { groupSubjectId, periodId } })
      // Un backend sin la migración de convenciones no manda la lista.
      .then((r) => ({ ...r.data, conventions: r.data.conventions ?? [] })),

  save: (payload: {
    student_id: number
    grade_column_id: number
    score: number | null
    convention_id?: number | null
    notes?: string
  }) => api.post<{ data: Grade }>('/grades', payload).then((r) => r.data.data),

  bulk: (
    grades: Array<{ student_id: number; grade_column_id: number; score: number | null; convention_id?: number | null }>
  ) =>
    api.post<{ data: Grade[]; count: number }>('/grades/bulk', { grades }).then((r) => r.data),

  recalculate: (groupSubjectId: number, periodId: number) =>
    api.post('/period-finals/calculate', null, { params: { groupSubjectId, periodId } }),

  clearSectionAdjustment: (id: number) => api.delete<{ data: SectionFinal }>(`/section-finals/${id}/adjust`),

  clearPeriodAdjustment: (id: number) => api.delete<{ data: PeriodFinal }>(`/period-finals/${id}/adjust`),

  adjustSectionFinal: (id: number, payload: { section_final: number; adjustment_reason: string }) =>
    api.put<{ data: SectionFinal }>(`/section-finals/${id}/adjust`, payload).then((r) => r.data.data),

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

export interface GradeConventionPayload {
  code: string
  label: string
  value: number | null
}

export const gradeConventionsApi = {
  list: () => api.get<{ data: GradeConvention[] }>('/grade-conventions').then((r) => r.data.data),

  create: (payload: GradeConventionPayload) =>
    api.post<{ data: GradeConvention }>('/grade-conventions', payload).then((r) => r.data.data),

  addSuggested: () => api.post<{ data: GradeConvention[] }>('/grade-conventions/suggested').then((r) => r.data.data),

  update: (id: number, payload: Partial<GradeConventionPayload>) =>
    api.put<{ data: GradeConvention }>(`/grade-conventions/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) => api.delete(`/grade-conventions/${id}`),

  reorder: (ids: number[]) =>
    api.patch<{ data: GradeConvention[] }>('/grade-conventions/reorder', { ids }).then((r) => r.data.data),
}

export interface NewGradeColumnPayload {
  grade_section_id: number
  column_type: 'manual'
  name: string
  short_name?: string
  max_score?: number
  date?: string
  weight_mode: 'automatic' | 'manual'
  weight?: number
}

/** Columnas sueltas de la planilla (agregar o renombrar sin pasar por Configurar planilla). */
export const gradeColumnsApi = {
  create: (payload: NewGradeColumnPayload) =>
    api.post<{ data: GradeColumn }>('/grade-columns', payload).then((r) => r.data.data),

  update: (id: number, payload: { name?: string; short_name?: string | null }) =>
    api.put<{ data: GradeColumn }>(`/grade-columns/${id}`, payload).then((r) => r.data.data),

  /** Mis cursos de la misma materia en los otros grupos del grado, con su sección del mismo nombre. */
  siblings: (sectionId: number) =>
    api
      .get<{ data: { group_subject_id: number; group_name: string; section_id: number | null }[] }>('/grade-columns/siblings', {
        params: { sectionId },
      })
      .then((r) => r.data.data),
}

/** Grupos de trabajo de una actividad. Se guardan todos juntos: lo que no va en la lista se elimina. */
export const workGroupsApi = {
  sync: (columnId: number, groups: WorkGroupDraft[]) =>
    api
      .put<{ data: WorkGroup[]; grades_updated: number }>(`/grade-columns/${columnId}/work-groups`, { groups })
      .then((r) => r.data),
}
