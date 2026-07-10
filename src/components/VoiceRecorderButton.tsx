import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Mic, Square, Play, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { voiceNotesApi } from '@/services/api/voiceNotes'
import { useAuthStore } from '@/store/authStore'
import type { VoiceNoteRelatedType } from '@/types/voiceNotes'

export function VoiceRecorderButton({
  relatedType,
  relatedId,
  fieldName,
}: {
  relatedType: VoiceNoteRelatedType
  relatedId: number
  fieldName: string
}) {
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((s) => s.user?.id)
  const [recording, setRecording] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number>(0)

  const queryKey = ['voice-notes', relatedType, relatedId]
  const { data: notes } = useQuery({
    queryKey,
    queryFn: () => voiceNotesApi.list(relatedType, relatedId),
  })
  const fieldNotes = notes?.filter((n) => n.field_name === fieldName) ?? []

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      startedAtRef.current = Date.now()
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const durationSeconds = (Date.now() - startedAtRef.current) / 1000
        setUploading(true)
        try {
          await voiceNotesApi.create({
            related_type: relatedType,
            related_id: relatedId,
            field_name: fieldName,
            audio: blob,
            audio_duration_seconds: durationSeconds,
          })
          toast.success('Nota de voz guardada.')
          queryClient.invalidateQueries({ queryKey })
        } catch {
          toast.error('No pudimos guardar la nota de voz.')
        } finally {
          setUploading(false)
        }
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
    } catch {
      toast.error('No pudimos acceder al micrófono.')
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  const play = async (id: number) => {
    setPlayingId(id)
    const url = await voiceNotesApi.objectUrl(id)
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => setPlayingId(null)
  }

  const remove = async (id: number) => {
    await voiceNotesApi.remove(id)
    queryClient.invalidateQueries({ queryKey })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {fieldNotes.map((note) => (
          <div key={note.id} className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs">
            <button
              type="button"
              onClick={() => play(note.id)}
              disabled={playingId === note.id}
              className="flex items-center gap-1 text-primary"
            >
              <Play className="h-3 w-3" /> {Math.round(note.audio_duration_seconds)}s
            </button>
            {note.user_id === currentUserId && (
              <button type="button" onClick={() => remove(note.id)} className="text-muted-foreground">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {recording ? (
        <Button type="button" variant="destructive" size="sm" className="w-fit" onClick={stopRecording}>
          <Square className="h-4 w-4" /> Detener grabación
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={startRecording} disabled={uploading}>
          <Mic className="h-4 w-4" /> {uploading ? 'Guardando...' : 'Grabar nota de voz'}
        </Button>
      )}
    </div>
  )
}
