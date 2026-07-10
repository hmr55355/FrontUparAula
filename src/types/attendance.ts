export type AttendanceStatus =
  | 'presente'
  | 'ausente_injustificado'
  | 'ausente_justificado'
  | 'tarde'
  | 'retirado_temprano'

export interface AttendanceRecord {
  id: number
  student_id: number
  group_subject_id: number
  date: string
  status: AttendanceStatus
  justification: string | null
  notes: string | null
  registered_by: number
  student?: { id: number; first_name: string; last_name: string }
}

export interface AttendanceStudent {
  id: number
  first_name: string
  last_name: string
  photo: string | null
}

export interface AttendanceDayResponse {
  students: AttendanceStudent[]
  records: Record<number, AttendanceRecord>
}

export interface AttendanceStatsRow {
  student_id: number
  student_name: string
  ausente_injustificado: number
  ausente_justificado: number
  tarde: number
}

export const ATTENDANCE_CYCLE: Array<AttendanceStatus | null> = [
  null,
  'presente',
  'ausente_injustificado',
  'tarde',
  'ausente_justificado',
]

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  presente: '✅ Presente',
  ausente_injustificado: '❌ Ausente',
  ausente_justificado: '📋 Justificado',
  tarde: '🕐 Tarde',
  retirado_temprano: 'Retirado',
}
