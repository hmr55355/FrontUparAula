import { api } from '@/services/api/client'

export interface GroupStudent {
  id: number
  first_name: string
  last_name: string
  photo: string | null
}

export const groupsApi = {
  students: (groupId: number) =>
    api.get<{ data: GroupStudent[] }>(`/groups/${groupId}/students`).then((r) => r.data.data),
}
