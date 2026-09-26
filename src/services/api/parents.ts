import { api } from '@/services/api/client'
import type { ParentGuardian, ParentRelationship } from '@/types/parents'

export interface CreateParentPayload {
  student_id: number
  first_name: string
  last_name: string
  relationship: ParentRelationship
  phone: string
  phone_alt?: string
  email?: string
  is_primary?: boolean
}

export const parentsApi = {
  list: (studentId: number) =>
    api.get<{ data: ParentGuardian[] }>('/parents', { params: { studentId } }).then((r) => r.data.data),

  create: (payload: CreateParentPayload) =>
    api.post<{ data: ParentGuardian }>('/parents', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<Omit<CreateParentPayload, 'student_id' | 'is_primary'>>) =>
    api.put<{ data: ParentGuardian }>(`/parents/${id}`, payload).then((r) => r.data.data),
}
