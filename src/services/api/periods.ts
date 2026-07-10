import { api } from '@/services/api/client'
import type { Period } from '@/types'

export const periodsApi = {
  list: (academicYearId: number) =>
    api.get<{ data: Period[] }>('/periods', { params: { yearId: academicYearId } }).then((r) => r.data.data),
}
