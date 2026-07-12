import { api } from '@/services/api/client'
import type { AcademicYear, Group, Institution, Subject } from '@/types'

export interface CreateInstitutionPayload {
  name: string
  city: string
  department: string
  nit?: string
  rector?: string
  grading_scale?: '1_to_10' | '1_to_5'
  min_passing_grade?: number
  academic_year: number
  academic_year_start: string
  academic_year_end: string
}

export const institutionsApi = {
  search: (params: { name?: string; nit?: string }) =>
    api.get<{ data: Institution[] }>('/institutions/search', { params }).then((r) => r.data.data),

  current: () => api.get<{ data: Institution }>('/institutions/current').then((r) => r.data.data),

  create: (payload: CreateInstitutionPayload) =>
    api.post<{ data: Institution }>('/institutions', payload).then((r) => r.data.data),

  join: (institutionId: number) => api.post('/institutions/join', { institution_id: institutionId }),

  acceptInvitation: (token: string) => api.post('/institutions/accept-invitation', { token }),

  academicYears: (institutionId: number) =>
    api.get<{ data: AcademicYear[] }>('/academic-years', { params: { institutionId } }).then((r) => r.data.data),

  createAcademicYear: (payload: { institution_id: number; year: number; start_date: string; end_date: string; is_active?: boolean }) =>
    api.post<{ data: AcademicYear }>('/academic-years', payload).then((r) => r.data.data),

  groups: (institutionId: number) =>
    api.get<{ data: Group[] }>('/groups', { params: { institutionId } }).then((r) => r.data.data),

  subjects: (institutionId: number) =>
    api.get<{ data: Subject[] }>('/subjects', { params: { institutionId } }).then((r) => r.data.data),

  // PUT con archivo no puebla $_FILES en PHP — se manda como POST con
  // _method=PUT (spoofing estándar de Laravel) para que el logo llegue bien.
  updateLogo: (institutionId: number, logo: File) => {
    const form = new FormData()
    form.append('_method', 'PUT')
    form.append('logo', logo)

    return api
      .post<{ data: Institution }>(`/institutions/${institutionId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data)
  },

  logoBlobUrl: (institutionId: number) =>
    api.get(`/institutions/${institutionId}/logo`, { responseType: 'blob' }).then((r) => URL.createObjectURL(r.data)),
}
