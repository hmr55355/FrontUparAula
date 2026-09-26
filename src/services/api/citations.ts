import { api } from '@/services/api/client'
import type { CitationStatus, CitationType, NotificationMethod, ParentCitation } from '@/types/citations'

export interface CitationFilters {
  groupId: number
  status?: CitationStatus
  citationType?: CitationType
  from?: string
  to?: string
}

export interface CitationPayload {
  student_id: number
  parent_id?: number | null
  group_id: number
  behavior_annotation_id?: number
  citation_type: CitationType
  reason: string
  scheduled_date?: string
  location?: string
  notification_method?: NotificationMethod
}

export const citationsApi = {
  list: (filters: CitationFilters) =>
    api.get<{ data: ParentCitation[] }>('/citations', { params: filters }).then((r) => r.data.data),

  create: (payload: CitationPayload) =>
    api.post<{ data: ParentCitation }>('/citations', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<Omit<CitationPayload, 'student_id' | 'group_id' | 'behavior_annotation_id'>>) =>
    api.put<{ data: ParentCitation }>(`/citations/${id}`, payload).then((r) => r.data.data),

  remove: (id: number) => api.delete(`/citations/${id}`),

  updateStatus: (
    id: number,
    payload: { status: CitationStatus; outcome?: string; commitments?: string; follow_up_date?: string }
  ) => api.patch<{ data: ParentCitation }>(`/citations/${id}/status`, payload).then((r) => r.data.data),
}
