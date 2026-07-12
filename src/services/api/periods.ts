import { api } from '@/services/api/client'
import type { Period } from '@/types'

export const periodsApi = {
  list: (academicYearId: number) =>
    api.get<{ data: Period[] }>('/periods', { params: { yearId: academicYearId } }).then((r) => r.data.data),

  create: (payload: { academic_year_id: number; number: number; name: string; start_date: string; end_date: string }) =>
    api.post<{ data: Period }>('/periods', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<{ name: string; start_date: string; end_date: string; is_closed: boolean }>) =>
    api.put<{ data: Period }>(`/periods/${id}`, payload).then((r) => r.data.data),

  setActive: (id: number) => api.patch<{ data: Period }>(`/periods/${id}/set-active`).then((r) => r.data.data),
}
