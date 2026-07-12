import { api } from '@/services/api/client'

export const exportApi = {
  yearData: (academicYearId: number) =>
    api.get(`/academic-years/${academicYearId}/export`, { responseType: 'blob' }).then((r) => r.data as Blob),
}
