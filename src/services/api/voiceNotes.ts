import { api } from '@/services/api/client'
import type { VoiceNote, VoiceNoteRelatedType } from '@/types/voiceNotes'

export const voiceNotesApi = {
  list: (relatedType: VoiceNoteRelatedType, relatedId: number) =>
    api
      .get<{ data: VoiceNote[] }>('/voice-notes', { params: { relatedType, relatedId } })
      .then((r) => r.data.data),

  create: (payload: {
    related_type: VoiceNoteRelatedType
    related_id: number
    field_name?: string
    audio: Blob
    audio_duration_seconds?: number
  }) => {
    const form = new FormData()
    form.append('related_type', payload.related_type)
    form.append('related_id', String(payload.related_id))
    if (payload.field_name) form.append('field_name', payload.field_name)
    form.append('audio', payload.audio, 'nota.webm')
    if (payload.audio_duration_seconds !== undefined) {
      form.append('audio_duration_seconds', String(Math.round(payload.audio_duration_seconds)))
    }

    return api
      .post<{ data: VoiceNote }>('/voice-notes', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data.data)
  },

  remove: (id: number) => api.delete(`/voice-notes/${id}`),

  // A plain <audio src> can't carry the Authorization header, so we fetch the
  // file as a blob through axios and hand the caller an object URL instead.
  objectUrl: (id: number) =>
    api.get(`/voice-notes/${id}`, { responseType: 'blob' }).then((r) => URL.createObjectURL(r.data)),
}
