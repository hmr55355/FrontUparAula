import { api } from '@/services/api/client'
import type { MyGroup } from '@/types'

export interface GroupStudent {
  id: number
  first_name: string
  last_name: string
  photo: string | null
}

export interface ConsolidatedSubject {
  group_subject_id: number
  name: string
  color: string
  teacher: string | null
  average: number | null
  failed: number
}

export interface ConsolidatedRow {
  student_id: number
  grades: Record<number, number | null>
  average: number | null
  failed: number
  absences: number
  rank: number | null
}

export interface ConsolidatedResponse {
  group: { id: number; name: string; director_id: number | null; director: { id: number; name: string } | null }
  period: { id: number; name: string }
  min_passing_grade: number
  subjects: ConsolidatedSubject[]
  students: { id: number; first_name: string; last_name: string }[]
  rows: ConsolidatedRow[]
}

export type PreEnrollmentStatus = 'pendiente' | 'confirmada' | 'no_continua'

export interface PreEnrollmentRow {
  student: { id: number; first_name: string; last_name: string; document_type: string; document_number: string | null }
  status: PreEnrollmentStatus
  target_grade_level_id: number | null
  notes: string | null
  saved: boolean
}

export interface PreEnrollmentResponse {
  target_year: number
  suggested_grade_level_id: number | null
  grade_levels: { id: number; name: string; level: number | null }[]
  rows: PreEnrollmentRow[]
  summary: Partial<Record<PreEnrollmentStatus, number>>
}

export const groupsApi = {
  students: (groupId: number) =>
    api.get<{ data: GroupStudent[] }>(`/groups/${groupId}/students`).then((r) => r.data.data),

  /** Grupos del año activo que dirijo o donde dicto (todos si soy admin), con mis permisos en cada uno. */
  mine: () => api.get<{ data: MyGroup[] }>('/groups/mine').then((r) => r.data.data),

  setDirector: (groupId: number, directorId: number | null) => api.put(`/groups/${groupId}`, { director_id: directorId }),

  consolidated: (groupId: number, periodId: number) =>
    api.get<ConsolidatedResponse>(`/groups/${groupId}/consolidated`, { params: { periodId } }).then((r) => r.data),

  preEnrollments: (groupId: number, targetYear?: number) =>
    api.get<PreEnrollmentResponse>(`/groups/${groupId}/pre-enrollments`, { params: { targetYear } }).then((r) => r.data),

  savePreEnrollments: (
    groupId: number,
    payload: {
      target_year: number
      items: { student_id: number; status: PreEnrollmentStatus; target_grade_level_id: number | null; notes: string | null }[]
    }
  ) => api.put<PreEnrollmentResponse>(`/groups/${groupId}/pre-enrollments`, payload).then((r) => r.data),
}
