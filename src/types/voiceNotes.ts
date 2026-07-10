export type VoiceNoteRelatedType = 'class_plan' | 'behavior_annotation' | 'observation' | 'citation'

export interface VoiceNote {
  id: number
  user_id: number
  related_type: VoiceNoteRelatedType
  related_id: number
  field_name: string | null
  audio_file_path: string
  audio_duration_seconds: number
  audio_format: 'webm' | 'mp3' | 'ogg'
  user?: { id: number; name: string }
}
