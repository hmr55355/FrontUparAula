import { api } from '@/services/api/client'
import type { Enrollment, Student, StudentFullProfile, StudentPayload } from '@/types/students'

export const studentsApi = {
  fullProfile: (studentId: number) =>
    api.get<StudentFullProfile>(`/students/${studentId}/full-profile`).then((r) => r.data),

  /** Matrículas del grupo, incluidas retiradas y trasladadas (solo admin). */
  enrollments: (groupId: number) =>
    api.get<{ data: Enrollment[] }>(`/groups/${groupId}/enrollments`).then((r) => r.data.data),

  create: (payload: StudentPayload & { group_id: number; enrollment_date?: string }) =>
    api.post<{ data: Student }>('/students', payload).then((r) => r.data.data),

  update: (id: number, payload: StudentPayload) =>
    api.put<{ data: Student }>(`/students/${id}`, payload).then((r) => r.data.data),

  withdraw: (id: number, payload: { group_id: number; withdrawal_date: string; withdrawal_reason?: string }) =>
    api.post(`/students/${id}/withdraw`, payload),

  transfer: (id: number, payload: { from_group_id: number; to_group_id: number; date: string; reason?: string }) =>
    api.post(`/students/${id}/transfer`, payload),

  enroll: (id: number, payload: { group_id: number; enrollment_date: string }) =>
    api.post(`/students/${id}/enroll`, payload),
}
