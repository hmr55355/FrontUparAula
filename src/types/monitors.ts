import type { AttendanceStatus } from '@/types/attendance'

export type SubmissionType = 'attendance' | 'behavior' | 'participation'
export type SubmissionStatus = 'pending' | 'approved' | 'rejected'

export interface AttendancePayload {
  date: string
  records: Array<{ student_id: number; status: AttendanceStatus; justification?: string | null }>
}

export interface BehaviorPayload {
  date: string
  student_id: number
  type: 'positiva' | 'negativa'
  observation: string
}

export interface ParticipationPayload {
  date: string
  entries: Array<{ student_id: number; points: number }>
}

export interface MonitorSubmission {
  id: number
  course_monitor_id: number
  group_subject_id: number
  submitted_by: number
  type: SubmissionType
  payload: AttendancePayload | BehaviorPayload | ParticipationPayload
  status: SubmissionStatus
  reviewed_at: string | null
  review_notes: string | null
  created_at: string
  updated_at: string
  group_subject?: {
    id: number
    group?: { id: number; name: string }
    subject?: { id: number; name: string; color?: string }
  }
  submitter?: { id: number; name: string }
  reviewer?: { id: number; name: string } | null
}

export interface SubmissionDetailResponse {
  data: MonitorSubmission
  students: Record<number, { id: number; first_name: string; last_name: string }>
  current_attendance: Record<number, AttendanceStatus>
}

/** Monitor habilitado en un curso (vista del docente). */
export interface CourseMonitor {
  id: number
  group_subject_id: number
  is_active: boolean
  pending_count?: number
  created_at: string
  user?: { id: number; name: string; username: string }
  student?: { id: number; first_name: string; last_name: string } | null
}

/** Curso asignado (vista del monitor). */
export interface MonitorCourse {
  id: number
  group_subject_id: number
  group_name: string
  subject_name: string
  subject_color: string
  teacher_name: string | null
}

export interface MonitorRosterResponse {
  students: Array<{ id: number; first_name: string; last_name: string }>
  records: Record<number, { student_id: number; status: AttendanceStatus; justification: string | null }>
  pending_submission: MonitorSubmission | null
}

export interface ParticipationRow {
  id: number
  student_id: number
  date: string
  points: number
  notes: string | null
  registered_by: number
  monitor_submission_id: number | null
}

export interface ParticipationsResponse {
  students: Array<{ id: number; first_name: string; last_name: string }>
  totals: Record<number, number>
  participations: ParticipationRow[]
}

export const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  attendance: 'Asistencia',
  behavior: 'Comportamiento',
  participation: 'Participación',
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
}
