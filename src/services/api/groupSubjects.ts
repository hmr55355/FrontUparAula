import { api } from '@/services/api/client'
import type { GroupSubject } from '@/types'

export const groupSubjectsApi = {
  myCourses: () => api.get<{ data: GroupSubject[] }>('/group-subjects').then((r) => r.data.data),
}
