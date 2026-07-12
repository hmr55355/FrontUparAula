import { api } from '@/services/api/client'

export interface StudentImportResult {
  created: number
  skipped: number
  errors: string[]
}

export const studentImportApi = {
  import: (groupId: number, file: File) => {
    const form = new FormData()
    form.append('group_id', String(groupId))
    form.append('file', file)

    return api
      .post<StudentImportResult>('/students/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data)
  },
}
