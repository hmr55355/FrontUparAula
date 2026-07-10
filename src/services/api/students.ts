import { api } from '@/services/api/client'
import type { StudentFullProfile } from '@/types/students'

export const studentsApi = {
  fullProfile: (studentId: number) =>
    api.get<StudentFullProfile>(`/students/${studentId}/full-profile`).then((r) => r.data),
}
