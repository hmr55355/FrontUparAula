import type { BehaviorAnnotation } from '@/types/behavior'
import type { ParentCitation } from '@/types/citations'
import type { ParentGuardian } from '@/types/parents'
import type { StudentObservation } from '@/types/observations'
import type { StudentCopyPayment } from '@/types/copies'

export interface StudentGradeSummary {
  group_subject_id: number
  subject_name: string
  subject_color: string
  group_name: string
  period_final: string | number | null
  is_promoted: boolean | null
}

export interface StudentAttendanceSummary {
  group_subject_id: number
  subject_name: string
  presente: number
  ausente_injustificado: number
  ausente_justificado: number
  tarde: number
}

export interface StudentFullProfile {
  student: Student
  active_period: { id: number; name: string } | null
  grades: StudentGradeSummary[]
  attendance_summary: StudentAttendanceSummary[]
  behavior: BehaviorAnnotation[]
  observations: StudentObservation[]
  parents: ParentGuardian[]
  citations: ParentCitation[]
  copy_payments: StudentCopyPayment[]
}

export type DocumentType = 'TI' | 'CC' | 'CE' | 'PA' | 'PPT'
export type Gender = 'masculino' | 'femenino' | 'otro'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  TI: 'Tarjeta de identidad',
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  PA: 'Pasaporte',
  PPT: 'Permiso por protección temporal',
}

export interface Student {
  id: number
  institution_id?: number
  first_name: string
  last_name: string
  document_type: DocumentType
  document_number: string | null
  birthdate: string | null
  gender: Gender | null
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  photo: string | null
}

export type EnrollmentStatus = 'activo' | 'retirado' | 'trasladado'

/** Matrícula de un estudiante en un grupo (student_groups). */
export interface Enrollment {
  id: number
  student_id: number
  group_id: number
  academic_year_id: number
  enrollment_date: string
  status: EnrollmentStatus
  withdrawal_date: string | null
  withdrawal_reason: string | null
  student: Student
}

export type StudentPayload = Partial<Omit<Student, 'id' | 'institution_id' | 'is_active' | 'photo'>>
